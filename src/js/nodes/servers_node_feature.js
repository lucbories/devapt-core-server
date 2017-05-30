// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T          from 'devapt-core-common/dist/js/utils/types'
import Collection from 'devapt-core-common/dist/js/base/collection'

// SERVER IMPORTS
import NodeFeature     from './node_feature'
import { ServerTypes } from '../servers/server'
import RestifyServer   from '../servers/restify_server'
import ExpressServer   from '../servers/express_server'
import LogsServer      from '../servers/logs_server'
import MetricsServer      from '../servers/metrics_server'



let context = 'server/nodes/servers_node_feature'



/**
 * @file Node feature: manages a set of servers.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class ServersNodeFeature extends NodeFeature
{
	/**
	 * Create a ServersNodefeature instance.
	 * @extends NodeFeature
	 * 
	 * @param {Node} arg_node - node instance.
	 * @param {string} arg_name - feature name.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_node, arg_name)
	{
		super(arg_node, arg_name)
		
		/**
		 * Class type flag.
		 * @type {boolean}
		 */
		this.is_servers_node_feature = true
		
		/**
		 * Servers instances collection.
		 * @type {Collection}
		 */
		this.servers = new Collection()
	}
	
	
	
	/**
	 * Load Node settings.
	 * 
	 * @returns {nothing}
	 */
	load()
	{
		const self = this
		this.node.enter_group(':ServersNodeFeature.load()')
		
		super.load()
		
		const servers_settings = this.node.get_setting('servers')
		assert( T.isFunction(servers_settings.forEach), context + ':load:bad servers_settings.forEach function')

		servers_settings.forEach(
			(server_cfg, server_name) => {
				self.node.info(':ServersNodeFeature.load:processing server creation of:' + server_name)
				
				// DEBUG
				// console.log(context + ':server=[%s] cfg=[%s]', server_name, JSON.stringify(server_cfg))

				const server_type = server_cfg.has('type') ? server_cfg.get('type') : null
				assert( T.isString(server_type), context + ':load:bad server type string for server name [' + server_name + ']')
				
				server_cfg = server_cfg.set('runtime', this.node.get_runtime() )
				server_cfg = server_cfg.set('logger_manager', this.node.get_logger_manager() )

				let server = self.create_server(server_type, server_name, server_cfg)
				server.load()
				server.update_trace_enabled()
				server.node = self.node
				
				self.servers.add(server)
				
				self.node.info(':ServersNodeFeature.load:server is created [' + server_name + ']')
			}
		)
		
		this.node.leave_group(':ServersNodeFeature.load()')
	}
	
	
	
	/**
	 * Starts node servers.
	 * 
	 * @returns {nothing}
	 */
	start()
	{
		const self = this
		this.node.enter_group(':ServersNodeFeature.start')
		
		super.start()

		this.servers.forEach(
			(server) => {
				const server_name = server.get_name()
				
				self.node.info(':ServersNodeFeature.start:starting server [' + server_name + ']')
				
				server.enable()
				server.enable_msg()
				
				self.node.info(':ServersNodeFeature.start:server is started [' + server_name + ']')
			}
		)
		
		this.node.leave_group(':ServersNodeFeature.start')
	}
	
	
	
	/**
	 * Stops node servers.
	 * 
	 * @returns {nothing}
	 */
	stop()
	{
		const self = this
		this.node.enter_group(':ServersNodeFeature.stop')
		
		super.stop()

		this.servers.forEach(
			(server) => {
				const server_name = server.get_name()
				
				self.node.info(':ServersNodeFeature.start:stopping server [' + server_name + ']')
				
				server.disable()
				
				self.node.info(':ServersNodeFeature.start:server is stopped [' + server_name + ']')
			}
		)
		
		this.node.leave_group(':ServersNodeFeature.stop')
	}

	
	
	/**
	 * Create a server instance on this node.
	 * 
	 * @param {string} arg_type - server type string
	 * @param {string} arg_name - server name string
	 * @param {object} arg_settings - server settings object
	 * 
	 * @returns {Server} - a new Server instance
	 */
	create_server(arg_type, arg_name, arg_settings)
	{
		// BUILD SERVER
		switch(arg_type)
		{
			case ServerTypes.SERVER_TYPE_EXPRESS: {
				return new ExpressServer(arg_name, arg_settings)
			}
			case ServerTypes.SERVER_TYPE_RESTIFY: {
				return new RestifyServer(arg_name, arg_settings)
			}
			case ServerTypes.SERVER_TYPE_CLUSTER: {
				return new ExpressServer(arg_name, arg_settings)
			}
			case ServerTypes.SERVER_TYPE_LOGS: {
				return new LogsServer(arg_name, arg_settings)
			}
			case ServerTypes.SERVER_TYPE_METRICS: {
				return new MetricsServer(arg_name, arg_settings)
			}
			default:{
				assert(false, context + ':ServersNodeFeature.create_server:bad server type [' + arg_type + '] for name [' + arg_name + ']')
			}
		}
	}
}
