// NPM IMPORTS
import assert from 'assert'
import { fromJS } from 'immutable'
import os from 'os'

// COMMON IMPORTS
import T                   from 'devapt-core-common/dist/js/utils/types'
import {SOURCE_LOCAL_FILE} from 'devapt-core-common/dist/js/datas/providers/json_provider'
import Context             from 'devapt-core-common/dist/js/base/context'
import RuntimeBase         from 'devapt-core-common/dist/js/base/runtime_base'
import topology_registry   from 'devapt-core-common/dist/js/topology/registry/index'
import {register_runtime}  from 'devapt-core-common/dist/js/base/runtime'

// SERVER IMPORTS
import Transaction         from './transaction'
import Security from './security'
import * as exec from '../runtime/index'


let context = 'server/base/runtime'



const logger_console_file = 'devapt-core-common/dist/js/loggers/logger_console'

/**
 * DEFAULT RUNTIME SETTINGS
 */
const default_settings = {
	'is_master':false,
	'name': null,

	'master':{
		'name': null,
		'host':'localhost',
		'port':5000
	},
	
	'settings_provider': {
		'source':SOURCE_LOCAL_FILE,
		'relative_path':'apps/world.json'
	}
}



/**
 * @file Runtime class - main library interface.
 * 
 * @author Luc BORIES
 * 
 * @license Apache-2.0
 */
class Runtime extends RuntimeBase
{
	/**
	 * Create a Runtime instance.
	 * @extends RuntimeBase
	 * 
	 * @returns {nothing}
	 */
	constructor()
	{
		super(context)
		
		// SET DEFAULT ATTRIBUTES VALUES
		this.is_server_runtime = true
		this.is_master = false
		this.uid = os.hostname() + '_' + process.pid
		
		this.node = null
		
		this.plugins_factory = undefined
		this.context = new Context(this)
		this.security_mgr = new Security(this, context, { 'logger_manager':this.get_logger_manager() } )
		
		this._state_store = topology_registry
		this.topology_registry = topology_registry
		this.defined_world_topology = undefined
		this.deployed_local_topology= undefined

		this.socketio_servers = {}
		
		this.info('Runtime is created')
	}
	
	
	
	/**
	 * Get runtime context.
	 * 
	 * @returns {Context}
	 */
	get_context()
	{
		return this.context
	}
	
	
	
	/**
	 * Get runtime node.
	 * 
	 * @returns {Node}
	 */
	get_node()
	{
		return this.node
	}
	
	
	
	/**
	 * Get runtime unique identifier.
	 * 
	 * @returns {string}
	 */
	get_uid()
	{
		return this.uid
	}
	
	
	
	/**
	 * Get topology runtime singleton.
	 * 
	 * @returns {object}
	 */
	get_registry()
	{
		return this.topology_registry
	}
	
	
	
	/**
	 * Get defined topology runtime singleton.
	 * 
	 * @returns {TopologyDefineWorld} - defined world topology.
	 */
	get_defined_topology()
	{
		return this.defined_world_topology
	}
	
	
	
	/**
	 * Get deployed topology runtime singleton.
	 * 
	 * @returns {TopologyDeployLocalNode} - deployed local node topology.
	 */
	get_deployed_topology()
	{
		return this.deployed_local_topology
	}
	
	
	
	/**
	 * Load runtime settings.
	 * 
	 * @param {object} arg_settings - runtime settings.
	 * 
	 * @returns {object} promise
	 */
	load(arg_settings)
	{
		const self = this

		// MERGE DEFAULT AND RUNTIME SETTINGS
		default_settings.runtime = this
		arg_settings.runtime = this
		this.$settings = fromJS( Object.assign(default_settings, arg_settings) )
		// console.log(context + ':load:runtime.$settings', this.$settings)

		// SET DEFAULT LOGGER
		const trace_stages_enabled = this.$settings.getIn(['trace', 'stages', 'enabled'], false)
		let console_logger_index = undefined
		let console_logger_uid = undefined
		if ( trace_stages_enabled )
		{
			const LoggerConsole = require(logger_console_file).default

			// console.log(context + ':load:add console logger')
			
			const console_settings = {
				enabled:true
			}
			const logger = new LoggerConsole(true, console_settings)
			console_logger_uid = logger.uid
			this._logger_manager.loggers.push(logger)
			console_logger_index = this._logger_manager.loggers.length - 1
			// console.log(context + ':load:add console logger index=' + console_logger_index)

			this.enable_trace()
		}

		// TRACES ARE ACTIVE IF ENABLED
		this.separate_level_1()
		this.enter_group('load')
		
		this.is_master = this.get_setting('is_master', false)
		// console.log(context + ':load:is_master', this.is_master, this.get_settings_js())
		
		const stage0 = new exec.RuntimeStage0Executable(this._logger_manager)
		const stage1 = new exec.RuntimeStage1Executable(this._logger_manager)
		const stage2 = new exec.RuntimeStage2Executable(this._logger_manager)
		const stage3 = new exec.RuntimeStage3Executable(this._logger_manager)
		const execs = [stage0, stage1, stage2, stage3]

		const tx = new Transaction('runtime', 'startup', 'loading', { runtime:this, logger_manager:this._logger_manager }, execs, Transaction.SEQUENCE)
		// console.log(context + ':load:before tx new')

		tx.prepare({runtime:this, logger_manager:this._logger_manager})
		// console.log(context + ':load:after tx prepare')

		const tx_promise = tx.execute(null)
		// console.log(context + ':load:after tx execute')

		if (console_logger_index >= 0)
		{
			// console.log(context + ':load:remove runtime loading console logger')
			tx_promise.then(
				() => {
					if (self.get_logger_manager().loggers.length > console_logger_index && self.get_logger_manager().loggers[console_logger_index].get_uid() == console_logger_uid)
					{
						console.log(context + ':load:remove console logger at ' + console_logger_index)
						self.get_logger_manager().loggers.splice(console_logger_index, 1)
					}
				}
			)
		}

		this.leave_group('load')
		this.separate_level_1()
		return tx_promise
	}

	
	
	/**
	 * Get security object.
	 * @returns {Security}
	 */
	security()
	{
		assert( T.isObject(this.security_mgr) && this.security_mgr.is_security, context + ':bad security object')
		return this.security_mgr
	}
	
	
	/**
	 * Get plugins factory object.
	 * @returns {PluginsFactory}
	 */
	get_plugins_factory()
	{
		assert( T.isObject(this.plugins_factory) && this.plugins_factory.is_plugins_factory, context + ':bad plugins factory object')
		return this.plugins_factory
	}
	
	
	
	/**
	 * Register and configure a socketio server.
	 * 
	 * @param {string} arg_server_name - bound server name.
	 * @param {object} arg_socketio - socketio server.
	 * 
	 * @returns {nothing}
	 */
	add_socketio(arg_server_name, arg_socketio)
	{
		const self = this
		assert( T.isString(arg_server_name), context + ':add_socketio:bad server name')
		assert( T.isObject(arg_socketio) && arg_socketio.emit && arg_socketio.on, context + ':add_socketio:bad socketio server')
		
		self.socketio_servers[arg_server_name] = arg_socketio
		
		arg_socketio.on('connection',
			function (socket)
			{
				console.info(context + ':add_socketio:new connection on /')
				
				// ROOT
				socket.on('disconnect',
					function()
					{
						console.info(context + ':add_socketio:new disconnection on /')
						self.on_socketio_disconnect()
					}
				)
				
				self.on_socketio_connect(arg_socketio, socket)
			}
		)
	}
	
	
	/**
	 * On socketio server connect event.
	 * @param {object} arg_socketio - socketio server.
	 * @param {object} arg_socket - client socket.
	 * @returns {nothing}
	 */
	on_socketio_connect(arg_socketio, arg_socket)
	{
		assert( T.isObject(arg_socketio) && arg_socketio.emit && arg_socketio.on, context + ':on_socketio_connect:bad socketio server')
		assert( T.isObject(arg_socket) && arg_socket.emit && arg_socket.on, context + ':on_socketio_connect:bad socketio socket client')

		// const self = this
		console.info(context + ':on_socketio_connect:socket connected')
		
		arg_socket.emit('welcome on /', { from: 'server runtime' })
		
		// ON PING
		// arg_socket.on('ping',
		// 	function(data)
		// 	{
		// 		console.info(context + ':on_socketio_connect:socket receives ping', data)
		// 		arg_socket.emit('pong', { from: 'server runtime' })
		// 	}
		// )
	}
	
	
	/**
	 * On socketio server disconnect event.
	 * @returns {nothing}
	 */
	on_socketio_disconnect()
	{
		console.info(context + ':on_socketio_disconnect:socket disconnected')
	}
}


let runtime_singleton = new Runtime()
register_runtime(runtime_singleton)

export default runtime_singleton
