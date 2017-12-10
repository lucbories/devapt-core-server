// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import MetricsState from '../base/metrics_state'


/**
 * Contextual constant for this file logs.
 * @private
 * @type {string}
 */
const context = 'server/metrics/bus/metrics_bus_state'



/**
 * Bus metrics state class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MetricBusState extends MetricsState
{
    /**
     * Metrics bus state constructor.
	 * 
	 * @returns {nothing}
     */
	constructor()
	{
		super('bus')
		
		/**
		 * Class test flag.
		 * @type {boolean}
		 */
		this.is_metrics_bus_state = true
	}
	
	
	
	/**
	 * Add bus_name state values.
	 * 
	 * @param {string} arg_bus_name - bus name valid string.
	 * 
	 * @returns {nothing}
	 */
	add_bus_name(arg_bus_name)
	{
		assert( T.isString(arg_bus_name) && arg_bus_name.length > 0, context + ':add_bus_name: bad bus_name string')
		
		if (arg_bus_name in this.values)
		{
			return
		}
		
		// CREATE HOSTNAME VALUES
		this.values[arg_bus_name] = {}
		
		// LAST SNAPSHOT
		this.values[arg_bus_name].last_metric = undefined
		
		
		// CONTINUOUS AGGREGATION
		const aggregated_init = {
			bus_name:undefined,
			
			count:0,
			
			msg_count:0,
			msg_size:0,
			errors_count:0,
			subscribers_count:0
		}
		this.values[arg_bus_name].aggregated = Object.assign({}, aggregated_init)
	}
}
