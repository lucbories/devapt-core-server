// SERVER IMPORTS
import MetricsCollector from '../base/metrics_collector'
import MetricsNodeJsRecord from './metrics_nodejs_record'
import MetricsNodeJsState from './metrics_nodejs_state'
import MetricsNodeJsReducer from './metrics_nodejs_reducer'


/**
 * Contextual constant for this file logs.
 * @private
 * @type {string}
 */
const context = 'server/metrics/nodejs/metrics_nodejs_collector'



/**
 * Metrics Node collector class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MetricsNodeJsCollector extends MetricsCollector
{
    /**
     * Metrics collector constructor.
	 * @extends MetricsCollector
	 * @param {Immutable.Map} arg_settings - instance settings map.
	 * @param {string} arg_log_context - trace context string.
	 * @returns {nothing}
     */
	constructor(arg_settings, arg_log_context)
	{
		super(arg_settings, (arg_log_context ? arg_log_context : context))
		
		/**
		 * Class test flag.
		 * @type {boolean}
		 */
		this.is_metrics_node_collector = true
		
		/**
		 * Timer instance.
		 * @type {Timer}
		 */
		this.scheduler = undefined
		
		/**
		 * Metrics reducer instance.
		 * @type {MetricsReducer}
		 */
		this.metrics_reducer = undefined
		
		/**
		 * Metrics state instance.
		 * @type {MetricsState}
		 */
		this.metrics_state = undefined
		
		/**
		 * Metrics record instance.
		 * @type {MetricsRecord}
		 */
		this.metrics_record = undefined
	}
	
	
    
	/**
     * Initialize metrics collector.
	 * 
	 * @returns {nothing}
     */
	init()
	{
		super.init()
		
		// CREATE REDUCER
		this.metrics_reducer = new MetricsNodeJsReducer()
		this.metrics_state = new MetricsNodeJsState()
		this.metrics_record = new MetricsNodeJsRecord()
		
		// SCHEDULE HOST METRICS
		const self = this
		const delay_in_sec = 300 // TODO SET IN SETTINGS
		this.metrics_record.before()
		const handler = () => {
			this.metrics_record.iteration()
			
			self.send_metrics(self.metrics_record.get_name(), [self.metrics_record.get_values()])
		}
		
		this.scheduler = setInterval(handler, delay_in_sec * 1000)
	}
	
	
    
	/**
     * Flush pending metrics records.
	 * 
	 * @returns {nothing}
     */
	flush()
	{
		super.flush()
	}
	
	
    
	/**
     * Flush and close the metrics collector.
	 * 
	 * @returns {nothing}
     */
	close()
	{
		clearInterval(this.scheduler)
		this.metrics_record.after()
		super.close()
	}
}
