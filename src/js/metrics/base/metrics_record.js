
// const context = 'server/metrics/base/metrics_record'



/**
 * Metrics record base class.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class MetricsRecord
{
    /**
     * Metrics record constructor.
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
		this.is_metrics_record  = true
		
		/**
		 * Metrics record name.
		 * @type {string}
		 */
		this.name = arg_metrics_name
		
		/**
		 * Metrics record values.
		 * @type {object}
		 */
		this.values = {}
		
		// SET VALUES METRIC NAME
		this.values.metric = this.get_name()
	}
	
	
	
	/**
     * Executed before request processing.
	 * 
	 * @returns {nothing}
     */
	before()
	{
	}
	
	
	
	/**
     * Executed at each request processing iteration.
	 * 
	 * @returns {nothing}
     */
	iteration()
	{
	}
	
	
	
	/**
     * Executed after request processing.
	 * 
	 * @returns {nothing}
     */
	after()
	{
	}
	
	
	
	/**
     * Returns metrics series name.
	 * 
	 * @returns {string} - name
     */
	get_name()
	{
		return this.name
	}
	
	
	
	/**
     * Returns metrics values plain object.
	 * 
	 * @returns {object} - values map plain object
     */
	get_values()
	{
		return this.values
	}
}