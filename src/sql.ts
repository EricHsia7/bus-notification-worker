import { Env } from '.';
import { NClientBackend } from './register';

export async function initializeDB(env: Env) {
  const createClientTable = `CREATE TABLE IF NOT EXISTS "Client" (
  "Number" INTEGER PRIMARY KEY,
  "ClientID" VARCHAR(50) NULL,
  "Secret" VARCHAR(50) NULL,
  "TimeStamp" INTEGER NULL
);`;
  const createScheduleTable = `CREATE TABLE IF NOT EXISTS "Schedule" (
  "Number" INTEGER PRIMARY KEY,
  "ScheduleID" VARCHAR(50) NULL,
  "ClientID" VARCHAR(50) NULL,
  "Message" VARCHAR(8000) NULL,
  "ScheduledTime" INTEGER NULL,
  "TimeStamp" INTEGER NULL
);`;
  await env.DB.prepare(createClientTable).run();
  await env.DB.prepare(createScheduleTable).run();
}

export async function addClient(client_id: NClientBackend['client_id'], secret: NClientBackend['secret'], env: Env) {
  const insertClient = `INSERT INTO "Client" ("ClientID", "Secret", "TimeStamp") VALUES (?, ?, ?);`;
  const timeStamp = new Date().getTime();
  await env.DB.prepare(insertClient).bind(client_id, secret, timeStamp).run();
}

export async function getClient(client_id: NClientBackend['client_id'], env: Env): Promise<object> {
  const selectClient = `SELECT * FROM Client WHERE ClientID = ?;`;
  const { results } = await env.DB.prepare(selectClient).bind(client_id).all();
  return results;
}
