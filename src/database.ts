import { TOTPPeriod, Env } from './index';

const ClientTableName = 'Client';
const createClientTable = `CREATE TABLE IF NOT EXISTS "${ClientTableName}" (
  "Number" INTEGER PRIMARY KEY,
  "ClientID" VARCHAR(50) NULL,
  "Secret" VARCHAR(50) NULL,
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
  "ScheduleID" VARCHAR(50) NULL,
  "ClientID" VARCHAR(50) NULL,
  "StopID" INTEGER NULL,
  "LocationName" VARCHAR(512) NULL,
  "RouteID" INTEGER NULL,
  "RouteName" VARCHAR(512) NULL,
  "Direction" VARCHAR(512) NULL,
  "EstimateTime" INTEGER NULL,
  "TimeFormattingMode" INTEGER NULL,
  "ScheduledTime" INTEGER NULL,
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
  TimeStamp: number;
}

const TOTPTokenTableName = 'TOTPToken';
const createTOTPToken = `CREATE TABLE IF NOT EXISTS "${TOTPTokenTableName}" (
  "Number" INTEGER PRIMARY KEY,
  "ClientID" VARCHAR(50) NULL,
  "Token" CHAR(8) NULL,
  "TimeStamp" INTEGER NULL
);`;

export interface NTOTPTokenBackend {
  Number: number;
  ClientID: NClientBackend['ClientID'];
  Token: string;
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

export async function recordTOTPToken(token: NTOTPTokenBackend['Token'], env: Env) {
  const insertTOTPToken = `INSERT INTO "${TOTPTokenTableName}" ("ClientID", "Token", "TimeStamp") VALUES (?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertTOTPToken).bind(client_id, token, timeStamp).run();
}

export async function discardExpiredTOTPToken(env: Env) {
  const deleteTOTPToken = `DELETE FROM "${TOTPTokenTableName}" WHERE TimeStamp < ?`;
  const deadline = new Date().getTime() - TOTPPeriod * 3 * 1000;
  await env.DB.prepare(deleteTOTPToken).bind(deadline).run();
}

export async function checkTOTPToken(client_id: NClientBackend['ClientID'], token: NTOTPTokenBackend['Token'], env: Env): Promise<boolean> {
  const selectTOTPToken = `SELECT * FROM "${TOTPTokenTableName}" WHERE ClientID = ? AND Token = ?`;
  const { results } = await env.DB.prepare(selectTOTPToken).bind(client_id, token).run();
  if (results.length > 0) {
    return true;
  } else {
    return false;
  }
}

export async function addSchedule(schedule_id: NScheduleBackend['ScheduleID'], client_id: NScheduleBackend['ClientID'], stop_id: NScheduleBackend['StopID'], location_name: NScheduleBackend['LocationName'], route_id: NScheduleBackend['RouteID'], route_name: NScheduleBackend['RouteName'], direction: NScheduleBackend['Direction'], estimate_time: NScheduleBackend['EstimateTime'], time_formatting_mode: NScheduleBackend['TimeFormattingMode'], scheduled_time: NScheduleBackend['ScheduledTime'], env: Env) {
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
    "ScheduledTime",
    "TimeStamp"
  )
VALUES
  (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertSchedule)
    .bind(schedule_id, client_id, stop_id, location_name, route_id, route_name, direction, estimate_time, time_formatting_mode, scheduled_time, timeStamp)
    .run();
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
