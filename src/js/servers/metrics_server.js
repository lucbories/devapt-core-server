// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import Server from './server'
import MetricsHostCollector from '../metrics/host/metrics_host_collector'
import MetricsNodeJsCollector from '../metrics/nodejs/metrics_nodejs_collector'
import MetricsHttpCollector from '../metrics/http/metrics_http_collector'
import MetricsBusCollector from '../metrics/bus/metrics_bus_collector'


const context = 'server/servers/metrics_server'



/**
 * @file Metrics server class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MetricsServer extends Server
{
	/**
	 * Create MetricsServer instance to process metrics records.
	 * @extends Server
	 * 
	 * @param {string} arg_name - server instance name
	 * @param {Immutable.Map} arg_settings - server instance settings
	 * @param {string} arg_context - logging context
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_name, arg_settings, arg_context)
	{
		super(arg_name, 'MetricsServer', arg_settings, arg_context ? arg_context : context)
		
		this.is_metric_server = true
        
		this.metrics_collectors = {}
		
		this.metrics_collectors['host'] = new MetricsHostCollector({}) // TODO find settings from parent settings
		this.metrics_collectors['nodejs'] = new MetricsNodeJsCollector({}) // TODO find settings from parent settings
		this.metrics_collectors['http'] = new MetricsHttpCollector({}) // TODO find settings from parent settings
		this.metrics_collectors['bus'] = new MetricsBusCollector({}) // TODO find settings from parent settings
		
		this.metrics_collectors['host'].init()
		this.metrics_collectors['nodejs'].init()
		this.metrics_collectors['http'].init()
		this.metrics_collectors['bus'].init()
	}
	
	
	
	/**
	 * Build server.
	 * 
	 * @returns {nothing}
	 */
	build_server()
	{
		this.enter_group('build_server')
		
		assert( this.server_protocole == 'bus', context + ':bad protocole for metric server [' + this.server_protocole + ']')
		
		this.leave_group('build_server')
	}



	/**
	 * Process received metrics message (to override in sub classes).
	 * 
	 * @param {DistributedMetrics} arg_msg - metrics message instance.
	 * 
	 * @returns {nothing}
	 */
	receive_metrics(arg_msg)
	{
		this.enter_group('receive_metrics')

		// console.log(context + ':receive_metrics:from=%s type=%s', arg_msg.sender, arg_msg.payload.metric)

		// DO NOT PROCESS MESSAGES FROM SELF
		if (arg_msg.sender == this.get_name())
		{
			this.leave_group('receive_metrics:ignore message from itself')
			return
		}

		this.process_metric(arg_msg.get_metrics_type(), arg_msg.get_metrics_values())

		this.leave_group('receive_metrics')
	}
    
	
    
    /**
     * Process metrics records.
	 * 
	 * {string} arg_metric_type - metrics type (host, http...)
     * {array} arg_metrics - Array of metrics plain objects
	 * 
	 * @returns {nothing}
     */
	process_metric(arg_metric_type, arg_metrics)
	{
		this.enter_group('process_metric')
		this.debug('metric type:' + arg_metric_type)
		
		// console.log(arg_metrics, context + ':process_metric:arg_metrics for ' + arg_metric_type)
		
		assert( T.isString(arg_metric_type), context + ':process_metric:bad metrics type')
		assert( T.isArray(arg_metrics) && arg_metrics.length > 0, context + ':process_metric:bad metrics array')
		assert( T.isObject(arg_metrics[0]) && T.isString(arg_metrics[0].metric) && arg_metrics[0].metric == arg_metric_type, context + ':process_metric:bad metrics[0] object')
		
		if (arg_metric_type in this.metrics_collectors)
		{
			this.debug('metrics collector found for ' + arg_metric_type)
			this.metrics_collectors[arg_metric_type].process_values(arg_metrics)
		}

		this.leave_group('process_metric')
	}
	
	
	
	/**
	 * Get metrics state values.
	 * 
	 * @param {string} arg_type - metrics type.
	 * 
	 * @returns {Object} - http state object.
	 */
	get_metrics_state_values(arg_type)
	{
		if (arg_type in this.metrics_collectors)
		{
			const metrics_collector = this.metrics_collectors[arg_type]
			assert( T.isObject(metrics_collector) && metrics_collector.is_metrics_collector, context + ':get_metrics_state_values:bad metrics collector object for ' + arg_type)
			
			return metrics_collector.get_state_values()
		}
		
		return undefined
	}
	
	
	
	// *************************************************** HTTP METRICS ***************************************************
	
	/**
	 * Get http metrics state values.
	 * 
	 * @returns {Object} - http state values object.
	 */
	get_http_metrics_state_values()
	{
		return this.get_metrics_state_values('http')
	}
	
	
	
	// *************************************************** HOST METRICS ***************************************************
	
	/**
	 * Get host metrics state values.
	 * 
	 * @returns {Object} - host state values object.
	 */
	get_host_metrics_state_values()
	{
		return this.get_metrics_state_values('host')
	}
	
	
	
	/**
	 * Get host metrics state values.
	 * 
	 * @returns {Object} - host state values object.
	 */
	get_host_metrics_state_values_items()
	{
		const state_values = this.get_metrics_state_values('host')
		let keys = Object.keys(state_values)
		
		const metric_index = keys.indexOf('metric')
		keys.splice(metric_index, 1)
		
		return { items:keys }
	}
	
	
	
	/**
	 * Get host metrics state values for an hostname.
	 * 
	 * @param {string} arg_hostname - hostname.
	 * 
	 * @returns {Object} - host state values object.
	 */
	get_host_metrics_state_values_for(arg_hostname)
	{
		const state_values = this.get_metrics_state_values('host')
		return (arg_hostname in state_values) ? state_values[arg_hostname] : { hostname:arg_hostname }
	}
	
	
	
	// *************************************************** BUS METRICS ***************************************************
	
	/**
	 * Get bus metrics state values.
	 * 
	 * @returns {Object} - bus state values object.
	 */
	get_bus_metrics_state_values()
	{
		return this.get_metrics_state_values('bus')
	}
	
	
	
	/**
	 * Get bus metrics state values.
	 * 
	 * @returns {Object} - bus state values object.
	 */
	get_bus_metrics_state_values_items()
	{
		const state_values = this.get_metrics_state_values('bus')
		let keys = Object.keys(state_values)
		
		const metric_index = keys.indexOf('metric')
		keys.splice(metric_index, 1)
		
		return { items:keys }
	}
	
	
	
	/**
	 * Get bus metrics state values for a bus name.
	 * 
	 * @param {string} arg_bus_name - bus name.
	 * 
	 * @returns {Object} - bus state values object.
	 */
	get_bus_metrics_state_values_for(arg_bus_name)
	{
		const state_values = this.get_metrics_state_values('bus')
		return (arg_bus_name in state_values) ? state_values[arg_bus_name] : { bus_name:arg_bus_name }
	}
	
	
	
	// *************************************************** NODEJS METRICS ***************************************************
	
	/**
	 * Get nodejs metrics state values.
	 * 
	 * @returns {Object} - nodejs state values object.
	 */
	get_nodejs_metrics_state_values()
	{
		const state_values = this.get_metrics_state_values('nodejs')
		// console.log(state_values, 'get_nodejs_metrics_state_values')
		return state_values
	}
	
	
	
	/**
	 * Get host metrics state values.
	 * 
	 * @returns {Object} - host state values object.
	 */
	get_nodejs_metrics_state_values_items()
	{
		const state_values = this.get_metrics_state_values('nodejs')
		let keys = Object.keys(state_values)
		
		const metric_index = keys.indexOf('metric')
		keys.splice(metric_index, 1)
		
		return { items:keys }
	}
	
	
	
	/**
	 * Get nodejs metrics state values for a nodejs instance.
	 * 
	 * @param {string} arg_runtime_uid - nodejs runtime uid.
	 * 
	 * @returns {Object} - nodejs state values object.
	 */
	get_nodejs_metrics_state_values_for(arg_runtime_uid)
	{
		const state_values = this.get_metrics_state_values('nodejs')
		const state_rt_values = (arg_runtime_uid in state_values) ? state_values[arg_runtime_uid] : { runtime_uid:arg_runtime_uid }
		// console.log(state_rt_values, 'get_nodejs_metrics_state_values_for', arg_runtime_uid)
		return state_rt_values
	}
}
