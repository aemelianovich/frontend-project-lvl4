// @ts-check

import _ from 'lodash';
import HttpErrors from 'http-errors';

const { Unauthorized, Conflict } = HttpErrors;

const getNextId = () => Number(_.uniqueId());

const buildState = (defaultState) => {
  const generalChannelId = getNextId();
  const randomChannelId = getNextId();
  const messageId1 = getNextId();
  const messageId2 = getNextId();
  const state = {
    channels: [
      { id: generalChannelId, name: 'general', removable: false },
      { id: randomChannelId, name: 'random', removable: false },
    ],
    messages: [
      {
        body: 'Welcome to our Chat.',
        channelId: generalChannelId,
        username: 'ghost',
        id: messageId1,
      },
      {
        body: 'Hi there.',
        channelId: generalChannelId,
        username: 'admin',
        id: messageId2,
      },
    ],
    currentChannelId: generalChannelId,
    users: [
      { id: 1, username: 'admin', password: 'admin' },
      { id: 2, username: 'test', password: 'test' },
      { id: 3, username: 'ghost', password: 'ghost' },
    ],
  };

  if (defaultState.messages) {
    state.messages.push(...defaultState.messages);
  }
  if (defaultState.channels) {
    state.channels.push(...defaultState.channels);
  }
  if (defaultState.currentChannelId) {
    state.currentChannelId = defaultState.currentChannelId;
  }
  if (defaultState.users) {
    state.users.push(...defaultState.users);
  }

  return state;
};

export default (app, defaultState = {}) => {
  const state = buildState(defaultState);

  app.io.on('connect', (socket) => {
    console.log({ 'socket.id': socket.id });

    socket.on('newMessage', (message, acknowledge = _.noop) => {
      const messageWithId = {
        ...message,
        id: getNextId(),
      };

      setTimeout(() => {
        state.messages.push(messageWithId);
        acknowledge({ status: 'ok' });
        app.io.emit('newMessage', messageWithId);
      }, 4000);
    });

    socket.on('newChannel', (channel, acknowledge = _.noop) => {
      const channelWithId = {
        ...channel,
        removable: true,
        id: getNextId(),
      };

      setTimeout(() => {
        state.channels.push(channelWithId);
        acknowledge({ status: 'ok', data: channelWithId });
        app.io.emit('newChannel', channelWithId);
      }, 4000);
    });

    socket.on('removeChannel', ({ id }, acknowledge = _.noop) => {
      const channelId = Number(id);
      state.channels = state.channels.filter((c) => c.id !== channelId);
      state.messages = state.messages.filter((m) => m.channelId !== channelId);
      const data = { id: channelId };

      acknowledge({ status: 'ok' });
      app.io.emit('removeChannel', data);
    });

    socket.on('renameChannel', ({ id, name }, acknowledge = _.noop) => {
      const channelId = Number(id);
      const channel = state.channels.find((c) => c.id === channelId);
      if (!channel) return;
      channel.name = name;

      setTimeout(() => {
        acknowledge({ status: 'ok' });
        app.io.emit('renameChannel', channel);
      }, 4000);
    });
  });

  app.post('/api/v1/login', async (req, reply) => {
    const username = _.get(req, 'body.username');
    const password = _.get(req, 'body.password');
    const user = state.users.find((u) => u.username === username);

    if (!user || user.password !== password) {
      reply.send(new Unauthorized());
      return;
    }

    const token = app.jwt.sign({ userId: user.id });
    reply.send({ token, username });
  });

  app.post('/api/v1/signup', async (req, reply) => {
    const username = _.get(req, 'body.username');
    const password = _.get(req, 'body.password');
    const user = state.users.find((u) => u.username === username);

    if (user) {
      reply.send(new Conflict());
      return;
    }

    const newUser = { id: getNextId(), username, password };
    const token = app.jwt.sign({ userId: newUser.id });
    state.users.push(newUser);
    reply
      .code(201)
      .header('Content-Type', 'application/json; charset=utf-8')
      .send({ token, username });
  });

  app.get('/api/v1/data', { preValidation: [app.authenticate] }, (req, reply) => {
    const user = state.users.find(({ id }) => id === req.user.userId);

    if (!user) {
      reply.send(new Unauthorized());
      return;
    }

    reply
      .header('Content-Type', 'application/json; charset=utf-8')
      .send(_.omit(state, 'users'));
  });

  app
    .get('*', (_req, reply) => {
      reply.view('index.pug');
    });
};
