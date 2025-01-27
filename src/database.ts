import { TOTPPeriod, Env, TOTPUsageLimit } from './index';
import { sha256 } from './tools';

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

const TOTPTokenTableName = 'TOTPToken';
const createTOTPToken = `CREATE TABLE IF NOT EXISTS "${TOTPTokenTableName}" (
  "Number" INTEGER PRIMARY KEY,
  "Hash" TEXT UNIQUE,
  "ClientID" TEXT NULL,
  "Token" TEXT NULL,
  "Count" INTEGER DEFAULT 0,
  "TimeStamp" INTEGER NULL
);`;

export interface NTOTPTokenBackend {
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
  await env.DB.prepare(createTOTPToken).run();
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

export async function recordTOTPToken(client_id: NClientBackend['ClientID'], token: NTOTPTokenBackend['Token'], env: Env) {
  const insertTOTPToken = `INSERT OR IGNORE INTO "${TOTPTokenTableName}" ("Hash", "ClientID", "Token", "TimeStamp") VALUES (?, ?, ?, ?);`;
  const updateTOTPToken = `UPDATE "${TOTPTokenTableName}" SET "Count" = "Count" + 1 WHERE Hash = ?;`;
  const timeStamp = new Date().getTime();
  const hash = sha256(`${token}${client_id}${token}`);
  await env.DB.prepare(insertTOTPToken).bind(hash, client_id, token, timeStamp).run();
  await env.DB.prepare(updateTOTPToken).bind(hash).run();
}

export async function discardExpiredTOTPToken(now: number, env: Env) {
  const deleteTOTPToken = `DELETE FROM "${TOTPTokenTableName}" WHERE TimeStamp < ?`;
  const deadline = now - TOTPPeriod * 3 * 1000;
  await env.DB.prepare(deleteTOTPToken).bind(deadline).run();
}

export async function checkTOTPToken(client_id: NTOTPTokenBackend['ClientID'], token: NTOTPTokenBackend['Token'], env: Env): Promise<boolean> {
  const selectTOTPToken = `SELECT "Count" FROM "${TOTPTokenTableName}" WHERE TimeStamp >= ? AND Hash = ? AND Count >= ?`;
  const deadline = new Date().getTime() - TOTPPeriod * 3 * 1000;
  const hash = sha256(`${token}${client_id}${token}`);
  const { results } = (await env.DB.prepare(selectTOTPToken).bind(deadline, hash, TOTPUsageLimit).all()) as Array<NTOTPTokenBackend>;
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
