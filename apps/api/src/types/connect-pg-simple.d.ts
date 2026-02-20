/**
 * Type declarations for connect-pg-simple
 *
 * PostgreSQL session store for express-session
 */

declare module 'connect-pg-simple' {
  import { Store } from 'express-session'
  import { Pool } from 'pg'

  interface PgSessionOptions {
    pool?: Pool
    pgPromise?: any
    conString?: string
    conObject?: any
    tableName?: string
    schemaName?: string
    pruneSessionInterval?: number | false
    errorLog?: (...args: any[]) => void
    createTableIfMissing?: boolean
  }

  function connectPgSimple(
    session: any
  ): new (options?: PgSessionOptions) => Store

  export = connectPgSimple
}
