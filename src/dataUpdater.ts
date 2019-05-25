import fetch from 'node-fetch';
import OrderedMap from './orderedMap';
import { readFile, writeFile } from './fsPromises';

const SEASON_START_TIMESTAMP = new Date(2019, 4, 17).valueOf();
const RACE_DAY = 6;
const RACE_HOUR = 22;
const MILLI_PER_DAY = 1000 * 60 * 60 * 24;
const MAX_SEARCH_HOURS = 6;
const MIN_SEARCH_HOURS = 1;
const MAX_SEARCH_HOURS_IN_PROGRESS = 0.5;
const MIN_SEARCH_HOURS_IN_PROGRESS = 0;

const PLAYERS_FILENAME = __dirname + '/players.json'
const CACHE_FILENAME = __dirname + '/cache.json'
const LEADERBOARD_FILENAME = __dirname + '/leaderboard.json'
const BINGO_REGEX = /http:\/\/www\.speedrunslive\.com\/tools\/oot-bingo\?mode=normal&amp;seed=\d+/

type Game = {
  id: number,
  name: string,
  abbrev: string,
  popularity: number,
  popularityrank: number,
}

type RaceResult = {
  race: string,
  place: number,
  player: string,
  time: number,
  message: string,
  oldtrueskill: number,
  newtrueskill: number,
  trueskillchange: number,
}

type Race = {
  id: string,
  game: Game,
  goal: string,
  date: string,
  numentrants: number,
  results: Array<RaceResult>,
}

type Player = {
  id: number,
  name: string,
  channel: string,
  country: string,
}

type Day = {
  date: number,
  month: number,
  year: number,
}

async function getRaceData(id: number): Promise<Race> {
  const res = await fetch(`http://api.speedrunslive.com/pastraces?id=${id}`);
  const data = await res.json();
  return data.pastraces[0];
}

function getAllRaceDaysSince(time: number) {
  let date = new Date(time);
  date.setHours(12);
  const day = date.getDay();
  if (day >= RACE_DAY) {
    date = new Date(date.valueOf() + MILLI_PER_DAY * (6 - RACE_DAY + day))
  } else if (day < RACE_DAY) {
    date = new Date(date.valueOf() + MILLI_PER_DAY * (RACE_DAY - day));
  }
  const now = new Date();
  const oneWeek = MILLI_PER_DAY * 7;
  const days: Array<Day> = [];
  while (date < now) {
    days.push({
      date: date.getDate(),
      month: date.getMonth(),
      year: date.getFullYear(),
    });
    date = new Date(date.valueOf() + oneWeek);
  }

  return days;
}

async function getPastRaces(): Promise<Array<Race>> {
  const res = await fetch('http://api.speedrunslive.com/pastraces?game=oot&pageSize=100');
  const json = await res.json();
  return json.pastraces.filter((race: Race) => race.goal.match(BINGO_REGEX));
}

async function getCurrentRaces(): Promise<Array<Race>> {
  const res = await fetch('http://api.speedrunslive.com/races');
  const json = await res.json();
  return json.races.filter((race: Race) => race.game.abbrev === 'oot' && race.goal.match(BINGO_REGEX));
}

function findIndexAfter<T>(array: Array<T>, start: number, predicate: (value: T, index: number, array: Array<T>) => boolean) {
  for (let i = start; i < array.length; i++) {
    const value = array[i];
    if (predicate(value, i, array)) {
      return i;
    }
  }
  return -1;
}

function takeWhileAfter<T>(array: Array<T>, start: number, predicate: (value: T, index: number, array: Array<T>) => boolean) {
  const ret: Array<T> = [];
  for (let i = start; i < array.length; i++) {
    const value = array[i];
    if (predicate(value, i, array)) {
      ret.push(value);
    } else {
      break;
    }
  }
  return ret;
}

function max<T>(array: Array<T>, lens: (val: T) => number) {
  let max = -Infinity;
  let maxIndex = -1;
  for (let i = 0; i < array.length; i++) {
    const value = lens(array[i]);
    if (value > max) {
      max = value;
      maxIndex = i;
    }
  }
  if (maxIndex === -1) {
    return null;
  }
  return array[maxIndex];
}

function inRange(min: number, max: number) {
  return (n: number) => n < max && n > min;
}

function caculateScoreForResult(result: RaceResult) {
  let t: number;
  if (result.place > 1000) {
    return 0;
  }
  if (result.time < 70 * 60) {
    t = 1.2;
  } else if (result.time < 80 * 60) {
    t = 1;
  } else if (result.time < 90 * 60) {
    t = 0.9;
  } else {
    t = 0.8;
  }
  return (95 * Math.exp(-0.3 * (result.place - 1)) + 5) * t;
}

type CachedRaceData = {
  scores: { [name: string]: number };
  timestamp: number;
}

async function getBestCurrentRace({ date, month, year }: Day) {
  const raceDate = new Date(year, month, date).valueOf();
  const races = await getCurrentRaces();
  const rangeCheck = inRange(
    raceDate + MIN_SEARCH_HOURS_IN_PROGRESS * 60 * 60 * 1000,
    raceDate + MAX_SEARCH_HOURS_IN_PROGRESS * 60 * 60 * 1000,
  );
  const candidateRaces = races.filter(race => rangeCheck(+race.date * 1000));
  return max(candidateRaces, race => race.numentrants);
}

async function getBestPastRaces(days: Array<Day>) {
  const races = await getPastRaces();
  let index = 0;
  return days.reverse().map(({ date, month, year }) => {
    const dateToFind = new Date(year, month, date, RACE_HOUR).valueOf();
    const rangeCheck = inRange(
      dateToFind + MIN_SEARCH_HOURS * 60 * 60 * 1000,
      dateToFind + MAX_SEARCH_HOURS * 60 * 60 * 1000,
    );
    const startIndex = findIndexAfter(races, index, race => rangeCheck(+race.date * 1000));
    if (startIndex === -1) {
      return null
    }
    const candidateRaces = takeWhileAfter(races, startIndex, race => rangeCheck(+race.date * 1000));
    index = startIndex;
    return max(candidateRaces, race => race.numentrants);
  });
}

async function getPlayer(name: string): Promise<Player> {
  const res = await fetch(`http://api.speedrunslive.com/players?id=${name}`);
  return res.json();
}

export default async function () {
  const cacheFile = await readFile(CACHE_FILENAME);
  const cache: OrderedMap<string, CachedRaceData> = cacheFile ? new OrderedMap(JSON.parse(cacheFile)) : new OrderedMap();

  const queryDate = cache.size > 0 ? cache.at(cache.size - 1).timestamp : SEASON_START_TIMESTAMP;

  const raceDatesToFind = getAllRaceDaysSince(queryDate);
  if (raceDatesToFind.length === 0) {
    return;
  }

  const bestCurrentRace = await getBestCurrentRace(raceDatesToFind[raceDatesToFind.length - 1]);
  if (bestCurrentRace) {
    raceDatesToFind.pop();
  }

  const bestPastRaces = (await getBestPastRaces(raceDatesToFind)).reverse();

  bestPastRaces.forEach(race => {
    if (!race) {
      return;
    }
    const scores: { [name: string]: number } = {};
    race.results.forEach(result => {
      scores[result.player] = caculateScoreForResult(result);
    });
    cache.set(race.id, {
      scores,
      timestamp: +race.date * 1000,
    });
  });

  const scores: { [name: string]: number } = {};
  cache.forEach(result => {
    Object.keys(result.scores).forEach(name => {
      if (!scores[name]) {
        scores[name] = 0;
      }
      scores[name] += result.scores[name];
    });
  });

  if (bestCurrentRace) {
    bestCurrentRace.results.forEach(result => {
      if (!scores[result.player]) {
        scores[result.player] = 0;
      }
      scores[result.player] += caculateScoreForResult(result);
    });
  }

  const playersFile = await readFile(PLAYERS_FILENAME);
  const playersCache: { [name: string]: Player } = playersFile ? JSON.parse(playersFile) : {};
  await Promise.all(Object.keys(scores).map(async name => {
    if (!playersCache[name]) {
      playersCache[name] = await getPlayer(name);
    }
  }));

  const leaderboard = Object.keys(scores)
    .map(name => ({ name, score: scores[name], twitch: playersCache[name].channel, country: playersCache[name].country }))
    .sort((a, b) => b.score - a.score)
    .map(result => ({ ...result, score: Math.round(result.score) }));


  await Promise.all([
    writeFile(PLAYERS_FILENAME, JSON.stringify(playersCache)),
    writeFile(CACHE_FILENAME, JSON.stringify(cache)),
    writeFile(LEADERBOARD_FILENAME, JSON.stringify(leaderboard)),
  ]);
}
