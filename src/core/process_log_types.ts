/**
 * Log types for our process logs
 */
export enum ProcessLogTypes {
    Generic = 'GENERIC',
    Warning = 'WARNING',
    ERROR = 'ERROR',
}

/** The expected log types */
export type PROCESS_JOB_LOG_TYPE = keyof ProcessLogTypes;
export default PROCESS_JOB_LOG_TYPE;
