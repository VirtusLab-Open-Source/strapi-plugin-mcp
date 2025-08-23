export default [
  {
    method: 'GET',
    path: '/streamable',
    handler: 'events.getStreamable',
    config: {
      auth: false,
      policies: [],
    },
  },
  {
    method: 'POST',
    path: '/streamable',
    handler: 'events.postStreamable',
    config: {
      auth: false,
      policies: [],
    },
  },

  {
    method: 'DELETE',
    path: '/streamable',
    handler: 'events.deleteStreamable',
    config: {
      auth: false,
      policies: [],
    },
  },
];
