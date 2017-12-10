// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T         from 'devapt-core-common/dist/js/utils/types'
import Instance  from 'devapt-core-common/dist/js/base/instance'

// SERVER INSTANCE
import MetricDuration from '../metrics/metric_duration'


/**
 * Contextual constant for this file logs.
 * @private
 * @type {string}
 */
const context = 'common/base/transaction'



/**
 * Transaction type:Sequence.
 * @private
 * @type {string}
 */
const TYPE_SEQUENCE  = 'SEQUENCE'

/**
 * Transaction type:Every.
 * @private
 * @type {string}
 */
const TYPE_EVERY  = 'EVERY'

/**
 * Transaction type:Only one.
 * @private
 * @type {string}
 */
const TYPE_ONE  = 'ONE'

/**
 * Transaction status:Is created.
 * @private
 * @type {string}
 */
const STATUS_CREATED  = 'CREATED'

/**
 * Transaction status:Is prepared.
 * @private
 * @type {string}
 */
const STATUS_PREPARED = 'PREPARED'

/**
 * Transaction status:Execution is OK.
 * @private
 * @type {string}
 */
const STATUS_EXEC_OK  = 'EXEC_OK'

/**
 * Transaction status:Execution has failed.
 * @private
 * @type {string}
 */
const STATUS_EXEC_KO  = 'EXEC_KO'



/**
 * @file Transaction class to manage grouped executions with commit/rollback features.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class Transaction extends Instance
{
	/**
	 * Create a Transaction. Set status to CREATED.
	 * 
	 * @param {string} arg_app_name - application name.
	 * @param {string} arg_svc_name - service name.
	 * @param {string} arg_tx_name - transaction name.
	 * @param {object} arg_settings - settings
	 * @param {Array} arg_executables - executables array (optional)
	 * @param {string} arg_type - transaction type (optional)
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_app_name, arg_svc_name, arg_tx_name, arg_settings, arg_executables, arg_type)
	{
		super('transactions', 'Transaction', arg_tx_name, arg_settings, context)
		
		/**
		 * Class test flag.
		 * @type {boolean}
		 */
		this.is_transaction = true
		
		/**
		 * Executables array.
		 * @type {array}
		 */
		this.executables = []
		
		/**
		 * Results array.
		 * @type {array}
		 */
		this.results = []

		/**
		 * Transaction type.
		 * @type {string}
		 */
		this.tx_type = undefined
		
		if (arg_executables)
		{
			this.set_executables(arg_executables)
		}
		
		this.set_type(arg_type)
		
		/**
		 * Duration metric instance.
		 * @type {MetricDuration}
		 */
		this.metric_duration = new MetricDuration()

		/**
		 * Metrics array.
		 * @type {Array}
		 */
		this.metrics = [this.metric_duration]

		/**
		 * Transaction status.
		 * @type {string}
		 */
		this.status = STATUS_CREATED
	}
	
	
	/**
	 * Set transaction executables.
	 * @param {Array} arg_executables - executables instances array.
	 * @returns {nothing}
	 */
	set_executables(arg_executables)
	{
		// console.log(context + 'set_executables')

		// ASSUME AN ARRAY
		this.executables = T.isArray(arg_executables) ? arg_executables : [arg_executables]
		
		// CHECK ARRAY ITEMS
		this.executables.forEach(
			(executable, index) => {
				// console.log(context + ':set_executables:index=' + index)
				assert( T.isObject(executable) && executable.is_executable, context + ':bad executable type at [' + index + ']')
			}
		)
	}
	
	
	/**
	 * Set the transaction type. Value should be choosen from the list:EVERY,SEQUENCE,ONE
	 *	  * EVERY: transaction is finished when all executables are finished without order.
	 *	  * SEQUENCE: transaction is finished when all executables are finished in a ordered sequence.
	 *	  * ONE: transaction is finished when an executable finished without waiting other executables.
	 * @param {string} arg_type - transaction type value.
	 * @returns {nothing}
	 */
	set_type(arg_type)
	{
		// console.log(context + ':set_type:type=[' + arg_type + ']')

		if ( ! T.isString(arg_type) )
		{
			arg_type = TYPE_EVERY
		}
		
		switch(arg_type)
		{
			case TYPE_EVERY:	this.tx_type = TYPE_EVERY   ; return
			case TYPE_ONE:	    this.tx_type = TYPE_ONE     ; return
			case TYPE_SEQUENCE: this.tx_type = TYPE_SEQUENCE; return
		}
		
		// console.log(context + ':set_type:type not found => default=[' + TYPE_EVERY + ']')

		this.tx_type = TYPE_EVERY
	}
	
	
	/**
	 * Prepare transaction executables. Change status to PREPARED.
	 * @param {object} arg_context - executables context.
	 * @returns {nothing}
	 */
	prepare(arg_context)
	{
		// debugger
		// console.log(context + 'prepare:type=', this.tx_type)

		this.metrics.forEach( (metric)=>{ metric.before() } )
		
		this.executables.forEach(
			(executable, index) => {
				// console.log(context + 'prepare:index=' + index)
				executable.prepare(arg_context)
			}
		)
		
		this.results = []
		this.status = STATUS_PREPARED
	}
	
	
	/**
	 * Execute all executables regarding the transaction type.
	 * @param {anything} arg_data - any parameter
	 * @returns {Promise} - a promise of executables results array
	 */
	execute(arg_data)
	{
		// console.log(context + ':execute:type=', this.tx_type)

		switch(this.tx_type)
		{
			case TYPE_EVERY: {
				return this.execute_every(arg_data)
			}
			case TYPE_ONE: {
				return this.execute_one(arg_data)
			}
			case TYPE_SEQUENCE: {
				return this.execute_sequence(arg_data)
			}
		}
		
		return Promise.resolve(false)
		// return Promise.reject('bad transaction type')
	}
	
	
	/**
	 * Execute every executables without order and fails if one failure appears.
	 * @param {anything} arg_data - any parameter
	 * @returns {Promise} - a promise of executables results array
	 */
	execute_every(arg_data)
	{
		const self = this
		let index = 0
		this.metric_duration.before()
		
		try
		{
			let tx_promises = []
			this.executables.forEach(
				(executable, index) => {
					// console.log(context + 'execute:index=' + index)
					let exec_promise = executable.execute(arg_data)
					tx_promises.push(exec_promise)
					
					exec_promise.then(
						function(value)
						{
							let has_error = executable.has_error()
							
							this.results.push(
								{
									index:index,
									result:value,
									has_error:has_error,
									error_msg:executable.get_error_msg()
								}
							)
							
							this.metrics.forEach( (metric)=>{ metric.iteration() } )
							
							if (has_error)
							{
								return false
							}
							
							return true
						}
					)
					
					index++
				}
			)
			
			let all_promise = Promise.all(tx_promises).then(
				function(results)
				{
					let all_result = true
					results.forEach(
						function(value/*, index, arr*/)
						{
							if (! value)
							{
								all_result = false
							}
						}
					)
					
					this.metric_duration.after()
					
					if (! all_result)
					{
						self.rollback()
						return false
					}
					
					self.commit()
					return true
				}
			)
			
			return all_promise
		}
		catch(e)
		{
			this.rollback()
		}
		
		return Promise.resolve(false)
	}
	
	
	/**
	 * Execute every executables without order and fulfill on first resolved, fails if one failure appears.
	 * @param {anything} arg_data - any parameter
	 * @returns {Promise} - a promise of executables results array
	 */
	execute_one(arg_data)
	{
		const self = this
		let index = 0
		this.metric_duration.before()
		
		try
		{
			let tx_promises = []
			this.executables.forEach(
				(executable) => {
					let exec_promise = executable.execute(arg_data)
					tx_promises.push(exec_promise)
					
					exec_promise.then(
						function(value)
						{
							let has_error = executable.has_error()
							
							this.results.push(
								{
									index:index,
									result:value,
									has_error:has_error,
									error_msg:executable.get_error_msg()
								}
							)
							
							this.metrics.forEach( (metric)=>{ metric.iteration() } )
							
							if (has_error)
							{
								return false
							}
							
							return true
						}
					)
					
					index++
				}
			)
			
			let all_promise = Promise.race(tx_promises).then(
				function(result)
				{
					this.metric_duration.after()
					
					if (! result)
					{
						self.rollback()
						return false
					}
					
					self.commit()
					return true
				}
			)
			
			return all_promise
		}
		catch(e)
		{
			this.rollback()
		}
		
		return Promise.resolve(false)
	}
	
	
	/**
	 * Execute every executables in a fixed order and stop on failure.
	 * @param {anything} arg_data - any parameter
	 * @returns {Promise} - a promise of executables results array
	 */
	execute_sequence(arg_data)
	{
		// console.log(context + ':execute_sequence')

		this.enter_group('execute a sequence of executables')
		
		const self = this
		this.metric_duration.before()
		try
		{
			let tx_promise = Promise.resolve(true)
			this.executables.forEach(
				(executable, index) => {
					// console.log('loop on executable', index, executable.$name)
					
					if ( tx_promise && tx_promise.then )
					{
						// console.log('promise exists')
						tx_promise = tx_promise.then(
							function(value)
							{
								// console.log('previous is resolved')
								if(!value)
								{
									console.log('previous executable error', index, executable.$name)
									return false
								}
								
								let exec_promise = executable.execute(arg_data)
								
								// EXECUTION WITHOUT EXCEPTION
								exec_promise = exec_promise.then(
									function(exec_value)
									{
										let has_error = executable.has_error()
										
										console.info('current executable [%s] [%s] without exception', index, executable.$name)
										if (has_error)
										{
											console.error('current executable [%s] [%s] with error', index, executable.$name)
										}
										
										self.results.push(
											{
												index:index,
												result:exec_value,
												has_error:has_error,
												error_msg:executable.get_error_msg()
											}
										)
										self.metrics.forEach( (metric)=>{ metric.iteration() } )
										
										return ! has_error
									}
								)
								
								// EXECUTION FAILURE WITH AN EXCEPTION
								exec_promise.catch(
									(reason)=>{
										console.log('current executable exception', index, executable.$name)
										self.results.push(
											{
												index:index,
												result:null,
												has_error:true,
												error_msg:reason
											}
										)
									}
								)
								
								return exec_promise
							}
						)
					}
				}
			)
			
			// TRANSACTION WITHOUT EXCEPTION
			tx_promise = tx_promise.then(
				function(result)
				{
					// console.log('executable success')
					
					self.metric_duration.after()
					
					if (! result)
					{
						self.rollback()
						return false
					}
					
					console.log('runtime loading parts duration', self.metric_duration.get_values().iterations)
					
					self.commit()
					return true
				}
			)
			
			// TRANSACTION FAILURE WITH EXCEPTION
			tx_promise = tx_promise.catch(
				(reason)=>{
					console.log('executable failure')
					self.metric_duration.after()
					
					console.error(context + ':exception:tx failure', reason)
					self.rollback()
					return false
				}
			)
			
			this.leave_group('execute a sequence of executables (OK) (async)')
			return tx_promise
		}
		catch(e)
		{
			console.error(context + ':exception:' + e)
			this.rollback()
		}
		
		console.log(context + 'execute a sequence of executables (KO) (async)')

		this.leave_group('execute a sequence of executables (KO) (async)')
		return Promise.resolve(false)
	}
	
	
	/**
	 * Commit transaction execution on executables success. Change status to EXEC_OK.
	 * @returns {nothing}
	 */
	commit()
	{
		this.executables.forEach(
			(executable) => {
				executable.exec_ack()
			}
		)
		this.status = STATUS_EXEC_OK
	}
	
	
	/**
	 * Rollback transaction execution on executables failure. Change status to EXEC_KO.
	 * @returns {nothing}
	 */
	rollback()
	{
		this.executables.forEach(
			(executable) => {
				executable.exec_fail()
			}
		)
		
		this.status = STATUS_EXEC_KO
		
		this.results.forEach(
			(value, index)=>console.log('result at executable [' + index + ']', value)
		)
	}
	
	
	/**
	 * Finish all executables.
	 * @returns {nothing}
	 */
	finish()
	{
		this.executables.forEach(
			(executable) => {
				executable.finish()
			}
		)
		
		this.metrics.forEach( (metric)=>{ metric.after() } )
	}
	
	
	/**
	 * Get instance description: {$type:..., $class:..., $id:..., $name:...}.
	 * @returns {object} - instance object description
	 */
	get_descriptor()
	{
		// TODO: delete this method ? Same as its parent!
		let parent_desc = super.get_descriptor()
		return parent_desc
	}
	
	
	/**
	 * Get transaction metrics: {id:..., status:..., metrics:...}.
	 * @returns {object} - transaction metrics plain object
	 */
	get_metrics()
	{
		let values = []
		this.metrics.forEach( (metric)=>{ values.push( metric.getvalues() ) } )
		return { $id:this.$id, $status:this.status, metrics:values }
	}
	
	
	/**
	 * Get executables results array: {index:..., result:..., has_error:..., error_msg:...}.
	 * @returns {Array} - all executed executables results.
	 */
	get_results()
	{
		return this.results
	}
	
	
	/**
	 * Get result of the first ended executable.
	 * @returns {object} - result object.
	 */
	get_first_result()
	{
		return this.results && this.results.length > 0 ? this.results[0] : null
	}
	
	
	/**
	 * Get result of the first ended executable which failed.
	 * @returns {object} - error object.
	 */
	get_first_error()
	{
		if ( this.results && this.results.length > 0 )
		{
			return this.results.find( (result) => { return result.has_error } )
		}
		
		return undefined
	}
}


/**
 * Transaction type SEQUENCE: all executables are run one at a time in the registered order.
 * @type {string}
 */
Transaction.SEQUENCE = TYPE_SEQUENCE

/**
 * Transaction type ONE: all executables are run at the same time without order and transaction ends when a run finish.
 * @type {string}
 */
Transaction.ONE = TYPE_ONE

/**
 * Transaction type EVERY: all executables are run at the same time without order.
 * @type {string}
 */
Transaction.EVERY = TYPE_EVERY
