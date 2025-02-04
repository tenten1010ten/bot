const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');

const token = '7598049091:AAGxc5riFKv2LxwrbYYc2oA_-DB75sBEg8Q'; // Обновленный токен
const bot = new TelegramBot(token, { polling: true });

const REWARD_BOT = 'https://t.me/Stand2gold_special_for_all_bot?start=Welcome';
const userData = new Map();
const userTimers = {}; // Таймеры пользователей

// Устанавливаем меню команд
bot.setMyCommands([
    { command: '/start', description: 'Начать взаимодействие' },
]);

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    if (!userData.has(chatId)) {
        userData.set(chatId, { received: false });
        await sendInitialMessage(chatId);
        scheduleReminders(chatId);
    }
});

async function sendInitialMessage(chatId) {
    const inlineKeyboard = {
        inline_keyboard: [
            [{ text: '✔️ Получить', callback_data: `get_reward_${chatId}` }],
        ],
    };
    await bot.sendMessage(chatId, '👇 Забери промокод тут ', {
        reply_markup: inlineKeyboard,
    });
}

function scheduleReminders(chatId) {
    if (userTimers[chatId]) return; // Предотвращаем дублирование таймеров

    const delays = [2, 5, 30, 60, 12 * 60]; // Минуты
    let index = 0;

    function sendNextReminder() {
        if (userData.get(chatId)?.received) return;
        sendInitialMessage(chatId);
        index++;
        if (index < delays.length) {
            userTimers[chatId] = setTimeout(
                sendNextReminder,
                delays[index] * 60 * 1000
            );
        }
    }

    userTimers[chatId] = setTimeout(
        sendNextReminder,
        delays[index] * 60 * 1000
    );
}

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const user = userData.get(chatId) || {};

    if (query.data.startsWith('get_reward_')) {
        user.received = true;
        userData.set(chatId, user);
        bot.answerCallbackQuery(query.id);

        // Останавливаем напоминания
        if (userTimers[chatId]) {
            clearTimeout(userTimers[chatId]);
            delete userTimers[chatId];
        }

        // Записываем факт получения в файл
        fs.appendFileSync('received_users.txt', `${chatId}\n`);

        bot.editMessageReplyMarkup(
            { inline_keyboard: [[{ text: '✔️ Получить', url: REWARD_BOT }]] },
            { chat_id: chatId, message_id: query.message.message_id }
        );
    }
});
