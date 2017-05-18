// NPM IMPORTS
import assert from 'assert'
import _ from 'lodash'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import runtime from '../base/runtime'
import Server from './server'


const context = 'server/servers/logs_server'



/**
 * @file Logs server class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class LogsServer extends Server
{
	/**
	 * Create LogsServer instance to process logs records.
	 * @extends Server
	 * 
	 * @param {string} arg_name - server instance name
	 * @param {Immutable.Map} arg_settings - server instance settings
	 * @param {string} arg_context - logging context
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_name, arg_settings, arg_log_context=context)
	{
		super(arg_name, 'LogsServer', arg_settings, arg_log_context)
		
		this.is_logs_server = true
	}
	
	
	
	/**
	 * Build server.
	 * 
	 * @returns {nothing}
	 */
	build_server()
	{
		this.enter_group('build_server')
		
		assert( this.server_protocole == 'bus', context + ':bad protocole for log server needed=[bus] settings=[' + this.server_protocole + ']')
		/*
{
	"timestamp":"9999999",
	"level":"debug",
	"source":"me",
	"values":["hello1", "hello2"]
}
		*/
		// const logs_handler = (msg)=>{
		// 	const logs_payload = msg.get_payload()
		// 	if (! logs_payload.timestamp || ! logs_payload.level || ! T.isNotEmptyArray(logs_payload.values) )
		// 	{
		// 		console.error(context + ':logs_handler:bad log msg payload format', logs_payload)
		// 		return
		// 	}
		// 	// const mgr = this.get_logger_manager()
		// 	// logs_payload.values.forEach(
		// 	// 	(log)=>{
		// 	// 		switch(logs_payload.level) {
		// 	// 			case 'debug': return mgr.debug([logs_payload.timestamp, logs_payload.level, log])
		// 	// 			case 'info':  return mgr.info([logs_payload.timestamp, logs_payload.level, log])
		// 	// 			case 'warn':  return mgr.warn([logs_payload.timestamp, logs_payload.level, log])
		// 	// 			case 'error': return mgr.error([logs_payload.timestamp, logs_payload.level, log])
		// 	// 		}
		// 	// 	}
		// 	// )
		// 	this.process
		// }
		// runtime.node.logs_bus.msg_subscribe('logs', logs_handler, this.get_name())

		runtime.node.logs_bus.msg_register(this, 'logs', 'receive_logs')

		runtime.node.leave_group('build_server')
	}



	/**
	 * Process received logs message.
	 * 
	 * @param {DistributedLogs} arg_msg - logs message instance.
	 * 
	 * @returns {nothing}
	 */
	receive_logs(arg_msg)
	{
		this.enter_group('receive_logs')

		console.log(context + ':receive_logs:from=%s payload=%s', arg_msg.get_sender(), JSON.stringify(arg_msg.get_payload()) )

		// DO NOT PROCESS MESSAGES FROM SELF
		if (arg_msg.get_sender() == this.get_name())
		{
			this.leave_group('receive_logs:ignore message from itself')
			return
		}

		this.process_logs(arg_msg.get_payload())

		this.leave_group('receive_logs')
	}
    
	
    
    /**
     * Process logs records.
	 * 
	 * {object} arg_logs_record - logs record { ts, level, source, logs }.
	 * 
	 * @returns {nothing}
     */
	process_logs(arg_logs_record)
	{
		this.enter_group('process_logs')
		
		assert( T.isObject(arg_logs_record),           context + ':process_logs:bad logs object')
		assert( T.isString(arg_logs_record.ts),        context + ':process_logs:bad logs.ts string')
		assert( T.isString(arg_logs_record.level),     context + ':process_logs:bad logs.level string')
		assert( T.isString(arg_logs_record.source),    context + ':process_logs:bad logs.source string')
		assert( T.isArray(arg_logs_record.logs),       context + ':process_logs:bad logs.logs array')
		
		// DEBUG
		// console.log(context + ':process_logs:arg_logs_record=', arg_logs_record)
		this.debug('log timestamp:'  + arg_logs_record.ts)
		this.debug('log level:'      + arg_logs_record.level)
		this.debug('log source:'     + arg_logs_record.source)
		this.debug('log logs count:' + arg_logs_record.logs.length)
		
		_.forEach(arg_logs_record.logs,
			(log_item)=>{
				this.process_log(arg_logs_record.ts, arg_logs_record.level, arg_logs_record.source, log_item)
			}
		)

		this.leave_group('process_logs')
	}
	
	
	
	/**
	 * Process one log record.
	 * 
	 * @param {string} arg_ts     - log timestamp.
	 * @param {string} arg_level  - log level.
	 * @param {string} arg_source - log source.
	 * @param {string} arg_text   - log text.
	 * 
	 * @returns {nothing}
	 */
	process_log(arg_ts, arg_level, arg_source, arg_text)
	{
		// TODO
		console.log(context + ':process_log:ts=[%s] level=[%s] source=[%s] text=[%s]', arg_ts, arg_level, arg_source, arg_text)
	}
}
