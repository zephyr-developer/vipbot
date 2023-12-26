const { Telegraf } = require('telegraf');
const token = process.env.TOKEN;
const bot = new Telegraf(token);
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello Express app!')
});

app.listen(3000, () => {
  console.log('server started');
});

bot.on('new_chat_members', async (ctx) => {
  const chatId = ctx.chat.id;
  const newMember = ctx.message.new_chat_participant;
  if (!newMember) {
    return; // Exit early if there is no new_chat_participant in the message
  }
  const userId = newMember.id;
  const username = newMember.username;
  const firstName = newMember.first_name;
  console.log(chatId, userId);
  try {
    await ctx.restrictChatMember(/*chatId, */userId, { can_send_messages: false });
    await ctx.reply(`进群验证已启用\n您好！ [${firstName}](tg://user?id=${userId})！你已经被禁言了，请等待管理员手动通过验证。`, {
      parse_mode: 'MarkdownV2',
      reply_markup: {
        inline_keyboard: [
          [{ text: '管理通过', callback_data: `approve_${userId}` }, { text: '管理踢出', callback_data: `kick_${userId}` }]
        ]
      }
    });
  } catch (error) {
    console.error(error);
  }
});

bot.action(/approve_(\d+)/, async (ctx) => {
  const chatId = ctx.chat.id;
  const newMemberId = ctx.match[1];
  const adminId = ctx.from.id;

  try {
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some((admin) => admin.user.id === adminId);
    if (!isAdmin) {
      await ctx.answerCbQuery('只有管理员才能进行此操作。');
      return;
    }

    const newMemberInfo = await ctx.telegram.getChatMember(chatId, newMemberId);
    const firstName = newMemberInfo.user.first_name;
    await ctx.telegram.promoteChatMember(chatId, newMemberId, { can_send_messages: true });
    //await ctx.telegram.deleteMessage(chatId, ctx.message.message_id);
    //await ctx.telegram.editMessageReplyMarkup(chatId, ctx.callbackQuery.message.message_id);
    await ctx.telegram.deleteMessage(chatId, ctx.callbackQuery.message.message_id);
    await ctx.reply(`恭喜 [${firstName}](tg://user?id=${newMemberId}) ID: \`${newMemberId}\` 获得入群资格。\n您已经自动被解封，如有问题，请找管理员：[Zephyr](tg://user?id=2084292168)。`, {
      parse_mode: 'MarkdownV2'
    });
    await ctx.answerCbQuery(`成功批准了 ${firstName} 的加入`, { show_alert: true });
  } catch (error) {
    console.error(error);
  }
});

bot.action(/kick_(\d+)/, async (ctx) => {
  console.log(ctx.message);
  const chatId = ctx.chat.id;
  const adminId = ctx.from.id;
  const kickedMemberId = ctx.match[1];

  try {
    const admins = await ctx.getChatAdministrators();
    const isAdmin = admins.some((admin) => admin.user.id === adminId);

    if (!isAdmin) {
      await ctx.answerCbQuery('只有管理员才能进行此操作。');
      return;
    }

    const kickedMember = await ctx.telegram.getChatMember(chatId, kickedMemberId);
    const firstName = kickedMember.user.first_name;

    await ctx.kickChatMember(kickedMemberId);
    //await ctx.telegram.editMessageReplyMarkup(chatId, ctx.callbackQuery.message.message_id);
    await ctx.telegram.deleteMessage(chatId, ctx.callbackQuery.message.message_id);
    await ctx.reply(`[${firstName}](tg://user?id=${kickedMemberId}) 已经被移除。`, {
      parse_mode: 'MarkdownV2'
    });
    await ctx.answerCbQuery(`已经移除 ${firstName}`);
  } catch (error) {
    console.error(error);
  }
});

bot.start((ctx) => ctx.reply('本机器人只在群里工作。更多详情请看：https://github.com/ALVINTAN159/vipbot', {disable_web_page_preview: true}));

bot.catch((error, ctx) => {
  console.error(`Error for ${ctx.updateType}`, error);
});

bot.launch();
