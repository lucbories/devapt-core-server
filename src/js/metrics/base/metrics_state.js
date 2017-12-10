
// const context = 'common/metrics/base/metrics_state'



/**
 * Metrics state base class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MetricsState
{
    /**
     * Metrics state constructor.
	 * 
	 * @param {string} arg_metrics_name - metrics series name ('http', 'host'...)
	 * 
	 * @returns {nothing}
     */
	constructor(arg_metrics_name)
	{
		/**
		 * Class test flag.
		 * @type {boolean}
		 */
		this.is_metrics_state  = true
		
		/**
		 * Metrics series name.
		 * @type {string}
		 */
		this.name = arg_metrics_name
		
		/**
		 * Metrics state values.
		 * @type {object}
		 */
		this.values = {}
		
		// SET METRIC TYPE NAME
		this.values.metric = this.get_name()
	}
	
	
	
	/**
     * Returns metrics series name.
	 * 
	 * @returns {string} - name.
     */
	get_name()
	{
		return this.name
	}
	
	
	
	/**
     * Returns metrics values plain object.
	 * 
	 * @returns {object} - values map plain object.
     */
	get_values()
	{
		return this.values
	}
	
	
	
	/**
     * Set metrics values plain object.
	 * 
	 * @param {object} arg_values - values plain object.
	 * 
	 * @returns {nothing}
     */
	set_values(arg_values)
	{
		this.values = arg_values
	}
}