import Koa from 'koa';
import Router from 'koa-router';
import update from './dataUpdater';
import ejs from 'ejs';
import serve from 'koa-static';
import mount from 'koa-mount';
import fs from 'fs';

import template from './index.ejs';
import font from './HyliaSerif.otf';
import { readFile } from './fsPromises';

const validFlags = new Set(require.context('./flags').keys());
console.log(validFlags);

const app = new Koa();
const router = new Router();

router.get('/', async context => {
  const leaderboardFile = await readFile(__dirname + '/leaderboard.json');
  const results = leaderboardFile ? JSON.parse(leaderboardFile) : [];

  context.body = ejs.render(template, { results, font, validFlags });
  update();
});

app.use(router.routes());
app.use(mount('/assets', serve(__dirname + '/assets')));

app.listen(8000);
