const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.MYTOKENBOT;
const bot = new TelegramBot(token, {
    polling: {
        interval: 300,
        autoStart: true,
        params: { timeout: 10 },
    },
});

const REWARD_BOT = 'https://t.me/Stand2gold_special_for_all_bot?start=Welcome';
const ACTIVATIONS_FILE = path.join(__dirname, 'activations.txt');

const userData = new Map();
const userTimers = {};

// Устанавливаем команды
bot.setMyCommands([
    { command: '/start', description: 'Начать взаимодействие' },
]);

// Команда /start
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;

    try {
        console.log(`Пользователь ${chatId} нажал /start`);

        // Очищаем старые данные
        userData.set(chatId, { received: false });

        // Останавливаем старые таймеры
        if (userTimers[chatId]) {
            clearTimeout(userTimers[chatId]);
            delete userTimers[chatId];
        }

        // Отправляем сообщение и запускаем напоминания
        await sendInitialMessage(chatId);
        scheduleReminders(chatId);
    } catch (error) {
        console.error('Ошибка обработки /start:', error);
    }
});

// Функция отправки сообщения
async function sendInitialMessage(chatId) {
    try {
        const inlineKeyboard = {
            inline_keyboard: [
                [
                    {
                        text: '✔️ Получить',
                        callback_data: `get_reward_${chatId}`,
                    },
                ],
            ],
        };
        await bot.sendMessage(chatId, '👇 Забери промокод тут ', {
            reply_markup: inlineKeyboard,
        });
    } catch (error) {
        console.error('Ошибка отправки сообщения:', error);
    }
}

// Планирование напоминаний
function scheduleReminders(chatId) {
    const delays = [
        2 * 60 * 1000,
        5 * 60 * 1000,
        30 * 60 * 1000,
        60 * 60 * 1000,
        12 * 60 * 60 * 1000,
    ];
    let index = 0;

    function sendNextReminder() {
        if (userData.get(chatId)?.received) return;

        sendInitialMessage(chatId)
            .then(() => {
                if (index < delays.length - 1) {
                    index++;
                    userTimers[chatId] = setTimeout(
                        sendNextReminder,
                        delays[index]
                    );
                }
            })
            .catch((error) => {
                console.error('Ошибка отправки напоминания:', error);
            });
    }

    userTimers[chatId] = setTimeout(sendNextReminder, delays[index]);
}

// Функция записи в файл
function logActivation(chatId) {
    const timestamp = new Date().toLocaleString('ru-RU', {
        timeZone: 'Europe/Moscow',
    });
    const previousActivations = fs.existsSync(ACTIVATIONS_FILE)
        ? fs.readFileSync(ACTIVATIONS_FILE, 'utf8')
        : '';
    const isRepeat = previousActivations.includes(chatId.toString());
    const logEntry = `${chatId} | ${timestamp} ${isRepeat ? '(Повтор)' : ''}\n`;
    fs.appendFileSync(ACTIVATIONS_FILE, logEntry, 'utf8');
}

// Обработка кнопки "Получить"
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const user = userData.get(chatId) || {};

    if (query.data.startsWith('get_reward_')) {
        user.received = true;
        userData.set(chatId, user);
        bot.answerCallbackQuery(query.id);

        // Запись в файл
        logActivation(chatId);

        // Останавливаем напоминания
        if (userTimers[chatId]) {
            clearTimeout(userTimers[chatId]);
            delete userTimers[chatId];
        }

        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [[{ text: '✔️ Получить', url: REWARD_BOT }]],
            },
            { chat_id: chatId, message_id: query.message.message_id }
        ).catch((error) => console.error('Ошибка изменения кнопки:', error));
    }
});
