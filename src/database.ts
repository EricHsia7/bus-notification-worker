import { Env } from '.';
import { TOTPPeriod } from './index';

const createClientTable = `CREATE TABLE IF NOT EXISTS "Client" (
  "Number" INTEGER PRIMARY KEY,
  "ClientID" VARCHAR(50) NULL,
  "Secret" VARCHAR(50) NULL,
  "TimeStamp" INTEGER NULL
);`;

export const ClientIDRegularExpression = /^(client_)([A-Za-z0-9_-]{32,32})$/gm;

export interface NClientBackend {
  Number: number;
  ClientID: string;
  Secret: string;
  TimeStamp: number;
}

const createScheduleTable = `CREATE TABLE IF NOT EXISTS "Schedule" (
  "Number" INTEGER PRIMARY KEY,
  "ScheduleID" VARCHAR(50) NULL,
  "ClientID" VARCHAR(50) NULL,
  "Message" VARCHAR(8000) NULL,
  "ScheduledTime" INTEGER NULL,
  "TimeStamp" INTEGER NULL
);`;

export const ScheduleIDRegularExpression = /^(schedule_)([A-Za-z0-9_-]{32,32})$/gm;

export interface NScheduleBackend {
  Number: number;
  ScheduleID: string;
  ClientID: NClientBackend['ClientID'];
  Message: string;
  ScheduledTime: number;
  TimeStamp: number;
}

const createTOTPToken = `CREATE TABLE IF NOT EXISTS "TOTPToken" (
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
  const insertClient = `INSERT INTO "Client" ("ClientID", "Secret", "TimeStamp") VALUES (?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertClient).bind(client_id, secret, timeStamp).run();
}

export async function getClient(client_id: NClientBackend['ClientID'], env: Env): Promise<NClientBackend | false> {
  const selectClient = `SELECT * FROM "Client" WHERE ClientID = ?;`;
  const { results } = (await env.DB.prepare(selectClient).bind(client_id).all()) as Array<NClientBackend>;
  if (results.length > 0) {
    return results[0];
  } else {
    return false;
  }
}

export async function setClientSecret(client_id: NClientBackend['ClientID'], previousSecret: NClientBackend['Secret'], newSecret: NClientBackend['Secret'], env: Env) {
  const updateSecret = `UPDATE "Client" SET "Secret" = ? WHERE ClientID = ? AND Secret = ?;`;
  await env.DB.prepare(updateSecret).bind(newSecret, client_id, previousSecret).run();
}

export async function recordTOTPToken(token: NTOTPTokenBackend['Token'], env: Env) {
  const insertTOTPToken = `INSERT INTO "TOTPToken" ("ClientID", "Token", "TimeStamp") VALUES (?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertTOTPToken).bind(client_id, token, timeStamp).run();
}

export async function discardExpiredTOTPToken(env: Env) {
  const deleteTOTPToken = `DELETE FROM "TOTPToken" WHERE TimeStamp < ?`;
  const deadline = new Date().getTime() - TOTPPeriod * 3 * 1000;
  await env.DB.prepare(deleteTOTPToken).bind(deadline).run();
}

export async function checkTOTPToken(client_id: NClientBackend['ClientID'], token: NTOTPTokenBackend['Token'], env: Env): Promise<boolean> {
  const selectTOTPToken = `SELECT * FROM "TOTPToken" WHERE ClientID = ? AND Token = ?`;
  const { results } = await env.DB.prepare(selectTOTPToken).bind(client_id, token).run();
  if (results.length > 0) {
    return true;
  } else {
    return false;
  }
}

export async function addSchedule(schedule_id: NScheduleBackend['ScheduleID'], client_id: NScheduleBackend['ClientID'], message: NScheduleBackend['Message'], scheduled_time: NScheduleBackend['ScheduledTime'], env: Env) {
  const insertSchedule = `INSERT INTO "Schedule" ("ScheduleID", "ClientID", "Message", "ScheduledTime", "TimeStamp") VALUES (?, ?, ?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertSchedule).bind(schedule_id, client_id, message, scheduled_time, timeStamp).run();
}

export async function listSchedules(deadline: number, env: Env): Promise<Array<NScheduleBackend>> {
  const selectSchedule = `SELECT * FROM "Schedule" WHERE ScheduledTime <= ?`;
  const { results } = (await env.DB.prepare(selectSchedule).bind(deadline).all()) as Array<NScheduleBackend>;
  return results;
}

export async function discardExpiredSchedules(deadline: number, env: Env) {
  const deleteSchedule = `DELETE FROM "Schedule" WHERE ScheduledTime <= ?`;
  const { results } = (await env.DB.prepare(deleteSchedule).bind(deadline).all()) as Array<NScheduleBackend>;
  return results;
}
