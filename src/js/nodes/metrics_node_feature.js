// NPM IMPORTS
import assert from 'assert'
import { fromJS } from 'immutable'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import NodeFeature from './node_feature'
import MetricsServer from '../servers/metrics_server'



let context = 'server/nodes/metrics_node_feature'



/**
 * @file Node feature: manages a set of metrics.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MetricsNodeFeature extends NodeFeature
{
	/**
	 * Create a MetricsNodefeature instance.
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
		
		this.is_metrics_node_feature = true
		
		this.metrics_server = undefined
	}
	
	
	
	/**
	 * Load Node settings.
	 * 
	 * @returns {nothing}
	 */
	load()
	{
		this.node.enter_group(':MetricsNodeFeature.load()')
		
		super.load()
		
		const metrics_bus_host = this.node.get_setting(['master', 'metrics_bus', 'host'], undefined)
		const metrics_bus_port = this.node.get_setting(['master', 'metrics_bus', 'port'], undefined)
	
		// CREATE METRICS SERVER
		const metrics_server_settings = {
			'protocole':'bus',
			'host':metrics_bus_host ? metrics_bus_host : 'localhost',
			'port':metrics_bus_port ? metrics_bus_port : 9900,
			'type':'metrics',
			'runtime':this.node.get_runtime(),
			'logger_manager':this.node.get_logger_manager()
		}
		
		console.log(metrics_server_settings.runtime.is_base_runtime ? 'RUNTIME FOUND FOR SERVER ' + 'metrics_server' : '!!! RUNTIME NOT FOUND FOR SERVER ' + 'metrics_server')
		console.log(metrics_server_settings.logger_manager.is_logger_manager ? 'LOGGER MANAGER FOUND FOR SERVER ' + 'metrics_server' : '!!! LOGGER MANAGER NOT FOUND FOR SERVER ' + 'metrics_server')
		
		this.metrics_server = new MetricsServer('metrics_server', fromJS(metrics_server_settings) )
		this.metrics_server.node = this.node
		this.metrics_server.load()

		this.node.metrics_bus_feature.bus.get_bus_engine().channel_add('metrics')
		this.node.metrics_bus_feature.bus.msg_register(this.metrics_server, 'metrics')
		// this.node.enable_locale_target('metrics_server')
		this.metrics_server.enable_metrics()
		
		this.node.leave_group(':MetricsNodeFeature.load()')
	}
	
	
	
	/**
	 * Get metrics server instance.
	 * @returns {Server} - Metrics server.
	 */
	get_metrics_server()
	{
		assert( T.isObject(this.metrics_server), context + ':MetricsNodeFeature.get_metrics_server:bad metrics_server object')
		return this.metrics_server
	}
	
	
	
	/**
	 * Starts node metrics.
	 * 
	 * @returns {nothing}
	 */
	start()
	{
		this.node.enter_group(':MetricsNodeFeature.start')
		
		
		this.node.leave_group(':MetricsNodeFeature.start')
	}
	
	
	
	/**
	 * Stops node metrics.
	 * 
	 * @returns {nothing}
	 */
	stop()
	{
		this.node.enter_group(':MetricsNodeFeature.stop')
		
		
		this.node.leave_group(':MetricsNodeFeature.stop')
	}
}
