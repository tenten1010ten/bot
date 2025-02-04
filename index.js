const TelegramBot = require('node-telegram-bot-api');

const token = '7983929468:AAFztqDgG9ABDBBaM7b0e59m7NMDu4axwMk'; // Обновленный токен
const bot = new TelegramBot(token, { polling: true });

const CHANNELS = ['TESTONEDAS', 'TESTBOSSSA']; // Два канала для подписки
const REWARD_BOT = 'https://t.me/STRANGETGJ_BOT?start=Premmbo';

const userData = new Map();
const userTimers = {}; // Таймеры пользователей

// Устанавливаем меню команд
bot.setMyCommands([
    { command: '/start', description: 'Начать взаимодействие' },
]);

bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    userData.set(chatId, { subscribed: false, received: false });
    await sendInitialMessage(chatId);
    scheduleReminders(chatId);
});

async function sendInitialMessage(chatId) {
    const inlineKeyboard = {
        inline_keyboard: [
            [
                {
                    text: '✔️ Подписаться на канал 1',
                    url: `https://t.me/${CHANNELS[0]}`,
                },
            ],
            [
                {
                    text: '✔️ Подписаться на канал 2',
                    url: `https://t.me/${CHANNELS[1]}`,
                },
            ],
            [
                {
                    text: '🔄 Проверить подписку',
                    callback_data: `check_sub_${chatId}`,
                },
            ],
            [
                {
                    text: '📩 Получить',
                    callback_data: `get_reward_${chatId}`,
                    disabled: true,
                },
            ],
            [
                {
                    text: '✔️ Готово',
                    callback_data: `done_${chatId}`,
                    disabled: true,
                },
            ],
        ],
    };
    await bot.sendMessage(
        chatId,
        '👇 забери подарочный сертификат вб на 10000 рублей ',
        { reply_markup: inlineKeyboard }
    );
}

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
        sendInitialMessage(chatId);
        if (index < delays.length - 1) {
            index++;
            userTimers[chatId] = setTimeout(sendNextReminder, delays[index]);
        }
    }
    userTimers[chatId] = setTimeout(sendNextReminder, delays[index]);
}

async function checkUserSubscription(chatId) {
    try {
        const results = await Promise.all(
            CHANNELS.map((channel) => bot.getChatMember(`@${channel}`, chatId))
        );
        return results.every((member) =>
            ['member', 'administrator', 'creator'].includes(member.status)
        );
    } catch (error) {
        console.error('Ошибка проверки подписки:', error);
        return false;
    }
}

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const user = userData.get(chatId) || {};

    if (query.data.startsWith('check_sub_')) {
        const isSubscribed = await checkUserSubscription(chatId);
        if (!isSubscribed) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Ты не подписался на оба канала',
                show_alert: true,
            });
        }
        user.subscribed = true;
        userData.set(chatId, user);
        bot.answerCallbackQuery(query.id, {
            text: '✅ Подписка подтверждена!',
            show_alert: true,
        });

        // Разблокируем кнопку "📩 Получить", но оставляем кнопку "🔄 Проверить подписку"
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [
                    [
                        {
                            text: '✅ Подписаться на канал 1',
                            url: `https://t.me/${CHANNELS[0]}`,
                        },
                    ],
                    [
                        {
                            text: '✅ Подписаться на канал 2',
                            url: `https://t.me/${CHANNELS[1]}`,
                        },
                    ],
                    [
                        {
                            text: '🔄 Проверить подписку',
                            callback_data: `check_sub_${chatId}`,
                        },
                    ],
                    [
                        {
                            text: '📩 Получить',
                            callback_data: `get_reward_${chatId}`,
                        },
                    ],
                    [
                        {
                            text: '✔️ Готово',
                            callback_data: `done_${chatId}`,
                            disabled: true,
                        },
                    ],
                ],
            },
            { chat_id: chatId, message_id: query.message.message_id }
        );
    }

    if (query.data.startsWith('get_reward_')) {
        if (!user.subscribed) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Сначала пройди проверку подписки',
                show_alert: true,
            });
        }
        user.received = true;
        userData.set(chatId, user);
        bot.answerCallbackQuery(query.id);

        // Разблокируем кнопку "✅ Готово"
        bot.editMessageReplyMarkup(
            {
                inline_keyboard: [
                    [
                        {
                            text: '✅ Подписаться на канал 1',
                            url: `https://t.me/${CHANNELS[0]}`,
                        },
                    ],
                    [
                        {
                            text: '✅ Подписаться на канал 2',
                            url: `https://t.me/${CHANNELS[1]}`,
                        },
                    ],
                    [
                        {
                            text: '🔄 Проверить подписку',
                            callback_data: `check_sub_${chatId}`,
                        },
                    ],
                    [{ text: '📩 Получить', url: REWARD_BOT }],
                    [{ text: '✅ Готово', callback_data: `done_${chatId}` }],
                ],
            },
            { chat_id: chatId, message_id: query.message.message_id }
        );
    }

    if (query.data.startsWith('done_')) {
        if (!user.received) {
            return bot.answerCallbackQuery(query.id, {
                text: '❌ Сначала нажми получить',
                show_alert: true,
            });
        }
        bot.answerCallbackQuery(query.id, { text: '✅ Завершено!' });

        if (userTimers[chatId]) {
            clearTimeout(userTimers[chatId]);
            delete userTimers[chatId];
        }
    }
});
