import { Env, TokenPeriod, TokenUsageLimit } from './index';
import { sha512 } from './tools';

const ClientTableName = 'Client';
const createClientTable = `CREATE TABLE IF NOT EXISTS "${ClientTableName}" (
  "Number" INTEGER PRIMARY KEY,
  "ClientID" TEXT UNIQUE,
  "Secret" TEXT NULL,
  "TimeStamp" INTEGER NULL
);`;

export const ClientIDRegularExpression = /^(client_)([A-Za-z0-9\_\-]{32,32})$/m;
// Gloab tag would result in altering test results because the worker is alive and does not restart every run

export interface NClientBackend {
  Number: number;
  ClientID: string;
  Secret: string;
  TimeStamp: number;
}

const ScheduleTableName = 'Schedule';
const createScheduleTable = `CREATE TABLE IF NOT EXISTS "${ScheduleTableName}" (
  "Number" INTEGER PRIMARY KEY,
  "ScheduleID" TEXT UNIQUE,
  "ClientID" TEXT NULL,
  "StopID" INTEGER NULL,
  "LocationName" TEXT NULL,
  "RouteID" INTEGER NULL,
  "RouteName" TEXT NULL,
  "Direction" TEXT NULL,
  "EstimateTime" INTEGER NULL,
  "TimeFormattingMode" INTEGER NULL,
  "ScheduledTime" INTEGER NULL,
  "TimeOffset" INTEGER NULL,
  "TimeStamp" INTEGER NULL
);`;
const createScheduleTableIndex = `CREATE INDEX IF NOT EXISTS "${ScheduleTableName}Index" ON "${ScheduleTableName}" (ScheduledTime ASC);`;

export const ScheduleIDRegularExpression = /^(schedule_)([A-Za-z0-9\_\-]{32,32})$/m;

export interface NScheduleBackend {
  Number: number;
  ScheduleID: string;
  ClientID: NClientBackend['ClientID'];
  StopID: number;
  LocationName: string;
  RouteID: number;
  RouteName: string;
  Direction: string;
  EstimateTime: number;
  TimeFormattingMode: number;
  ScheduledTime: number;
  TimeOffset: number;
  TimeStamp: number;
}

const TokenTableName = 'Token';
const createToken = `CREATE TABLE IF NOT EXISTS "${TokenTableName}" (
  "Number" INTEGER PRIMARY KEY,
  "Hash" TEXT UNIQUE,
  "ClientID" TEXT NULL,
  "Token" TEXT NULL,
  "Count" INTEGER DEFAULT 0,
  "TimeStamp" INTEGER NULL
);`;

export interface NTokenBackend {
  Number: number;
  Hash: string;
  ClientID: NClientBackend['ClientID'];
  Token: string;
  Count: number;
  TimeStamp: number;
}

export async function initializeDB(env: Env) {
  await env.DB.prepare(createClientTable).run();
  await env.DB.prepare(createScheduleTable).run();
  await env.DB.prepare(createScheduleTableIndex).run();
  await env.DB.prepare(createToken).run();
}

export async function addClient(client_id: NClientBackend['ClientID'], secret: NClientBackend['Secret'], env: Env) {
  const insertClient = `INSERT INTO "${ClientTableName}" ("ClientID", "Secret", "TimeStamp") VALUES (?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertClient).bind(client_id, secret, timeStamp).run();
}

export async function getClient(client_id: NClientBackend['ClientID'], env: Env): Promise<NClientBackend | false> {
  const selectClient = `SELECT * FROM "${ClientTableName}" WHERE ClientID = ?;`;
  const { results } = (await env.DB.prepare(selectClient).bind(client_id).all()) as Array<NClientBackend>;
  if (results.length > 0) {
    return results[0];
  } else {
    return false;
  }
}

export async function setClientSecret(client_id: NClientBackend['ClientID'], newSecret: NClientBackend['Secret'], env: Env) {
  const updateSecret = `
  UPDATE "${ClientTableName}" 
  SET "Secret" = ?, "TimeStamp" = ?
  WHERE "ClientID" = ?;
`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(updateSecret).bind(newSecret, timeStamp, client_id).run();
}

export async function recordToken(client_id: NClientBackend['ClientID'], token: NTokenBackend['Token'], env: Env) {
  const insertToken = `INSERT OR IGNORE INTO "${TokenTableName}" ("Hash", "ClientID", "Token", "TimeStamp") VALUES (?, ?, ?, ?);`;
  const updateToken = `UPDATE "${TokenTableName}" SET "Count" = "Count" + 1 WHERE Hash = ?;`;
  const timeStamp = new Date().getTime();
  const hash = sha512(`${sha512(client_id)}${sha512(token)}`);
  await env.DB.prepare(insertToken).bind(hash, client_id, token, timeStamp).run();
  await env.DB.prepare(updateToken).bind(hash).run();
}

export async function discardExpiredToken(now: number, env: Env) {
  const deleteToken = `DELETE FROM "${TokenTableName}" WHERE TimeStamp < ?`;
  const deadline = now - TokenPeriod * 5 * 1000;
  await env.DB.prepare(deleteToken).bind(deadline).run();
}

export async function checkToken(client_id: NTokenBackend['ClientID'], token: NTokenBackend['Token'], env: Env): Promise<boolean> {
  const selectToken = `SELECT "Count" FROM "${TokenTableName}" WHERE TimeStamp >= ? AND Hash = ? AND Count > ?`;
  const deadline = new Date().getTime() - TokenPeriod * 5 * 1000;
  const hash = sha512(`${sha512(client_id)}${sha512(token)}`);
  const { results } = (await env.DB.prepare(selectToken).bind(deadline, hash, TokenUsageLimit).all()) as Array<NTokenBackend>;
  if (results.length > 0) {
    return false;
  } else {
    return true;
  }
}

export async function addSchedule(schedule_id: NScheduleBackend['ScheduleID'], client_id: NScheduleBackend['ClientID'], stop_id: NScheduleBackend['StopID'], location_name: NScheduleBackend['LocationName'], route_id: NScheduleBackend['RouteID'], route_name: NScheduleBackend['RouteName'], direction: NScheduleBackend['Direction'], estimate_time: NScheduleBackend['EstimateTime'], time_formatting_mode: NScheduleBackend['TimeFormattingMode'], time_offset: NScheduleBackend['TimeOffset'], scheduled_time: NScheduleBackend['ScheduledTime'], env: Env) {
  const insertSchedule = `INSERT INTO
  "${ScheduleTableName}" (
    "ScheduleID",
    "ClientID",
    "StopID",
    "LocationName",
    "RouteID",
    "RouteName",
    "Direction",
    "EstimateTime",
    "TimeFormattingMode",
    "TimeOffset",
    "ScheduledTime",
    "TimeStamp"
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertSchedule).bind(schedule_id, client_id, stop_id, location_name, route_id, route_name, direction, estimate_time, time_formatting_mode, time_offset, scheduled_time, timeStamp).run();
}

export async function getSchedule(schedule_id: NScheduleBackend['ScheduleID'], client_id: NScheduleBackend['ClientID'], env: Env): Promise<NScheduleBackend | false> {
  const selectSchedule = `SELECT * FROM "${ScheduleTableName}" WHERE ScheduleID = ? AND ClientID = ?`;
  const { results } = (await env.DB.prepare(selectSchedule).bind(schedule_id, client_id).all()) as Array<NScheduleBackend>;
  if (results.length > 0) {
    return results[0];
  } else {
    return false;
  }
}

export async function modifySchedule(schedule_id: NScheduleBackend['ScheduleID'], estimate_time: NScheduleBackend['EstimateTime'], scheduled_time: NScheduleBackend['ScheduledTime'], env: Env) {
  const updateSchedule = `
  UPDATE "${ScheduleTableName}"
  SET "EstimateTime" = ?, "ScheduledTime" = ?, "TimeStamp" = ?
  WHERE ScheduleID = ?`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(updateSchedule).bind(estimate_time, scheduled_time, timeStamp, schedule_id).run();
}

export async function discardSchedule(schedule_id: NScheduleBackend['ScheduleID'], env: Env) {
  const deleteSchedule = `DELETE FROM "${ScheduleTableName}" WHERE ScheduleID = ?`;
  await env.DB.prepare(deleteSchedule).bind(schedule_id).run();
}

export async function listSchedules(deadline: number, env: Env): Promise<Array<NScheduleBackend>> {
  const selectSchedule = `SELECT * FROM "${ScheduleTableName}" WHERE ScheduledTime <= ?`;
  const { results } = (await env.DB.prepare(selectSchedule).bind(deadline).all()) as Array<NScheduleBackend>;
  return results;
}

export async function discardExpiredSchedules(deadline: number, env: Env) {
  const deleteSchedule = `DELETE FROM "${ScheduleTableName}" WHERE ScheduledTime <= ?`;
  const { results } = (await env.DB.prepare(deleteSchedule).bind(deadline).all()) as Array<NScheduleBackend>;
  return results;
}
