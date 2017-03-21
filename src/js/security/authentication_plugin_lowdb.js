// NPM IMPORTS
import assert from 'assert'
import lowdb from 'lowdb'
import path from 'path'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import runtime from '../base/runtime'
import AuthenticationPlugin from './authentication_plugin'


let context = 'server/security/authentication_lowdb_plugin'



/**
 * Authentication class with a LowDb user/login database.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class AuthenticationLowDbPlugin extends AuthenticationPlugin
{
	/**
	 * Create an Authentication plugin class based on query parameters.
	 * 
	 * @param {AuhtenticationManager} arg_manager - authentication plugins manager.
	 * @param {string} arg_name - plugin name.
	 * @param {string|undefined} arg_log_context - optional.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_manager, arg_name, arg_log_context)
	{
		super(runtime, arg_manager, arg_name, 'AuthenticationLowDbPlugin', arg_log_context ? arg_log_context : context)
		
		this.is_authentication_lowdb_plugin = true
		
		// this.is_trace_enabled = true
	}
	
	
	
	/**
	 * Enable authentication plugin with contextual informations.
	 * 
	 * @param {object|undefined} arg_settings - optional contextual settings.
	 * 
	 * @returns {object} - a promise object of a boolean result (success:true, failure:false)
	 */
	enable(arg_settings)
	{
		this.enter_group('enable')
		
		const self = this
		
		// console.log(arg_settings, 'arg_settings')
		
		// GET SETTINGS PLAIN OBJECT
		arg_settings = T.isFunction(arg_settings.toJS) ? arg_settings.toJS() : arg_settings
		
		// CALL BASE CLASS METHOD
		let resolved_promise = super.enable(arg_settings)
		
		// SET FIELD NAMES FOR USER NAME
		if (arg_settings && T.isString(arg_settings.username_fieldname) )
		{
			this.username_fieldname = arg_settings.username_fieldname
		}
		
		// SET FIELD NAMES FOR PASSWORD
		if (arg_settings && T.isString(arg_settings.password_fieldname) )
		{
			this.password_fieldname = arg_settings.password_fieldname
		}
		
		// SET FIELD NAMES FOR ID
		if (arg_settings && T.isString(arg_settings.id_fieldname) )
		{
			this.id_fieldname = arg_settings.id_fieldname
		}
		
		// SET REDIRECTION ROUTE ON SUCCESS
		if (arg_settings && T.isString(arg_settings.success_redirect) )
		{
			this.success_redirect = arg_settings.success_redirect
		}
		
		// SET REDIRECTION ROUTE ON FAILURE
		if (arg_settings && T.isString(arg_settings.failure_redirect) )
		{
			this.failure_redirect = arg_settings.failure_redirect
		}
		
		// SET USE OF SESSION FLAG
		if (arg_settings && T.isBoolean(arg_settings.use_session) )
		{
			this.use_session = arg_settings.use_session
		}
		
		// SET FILE NAME
		this.file_name = null
		if (arg_settings && T.isString(arg_settings.file_name) )
		{
			this.file_name = arg_settings.file_name
		}
		
		// LOAD FILE DB
		this.file_db = null
		if (this.file_name)
		{
			resolved_promise = resolved_promise.then(
				function()
				{
					const base_dir = runtime.get_setting('base_dir', null)
					assert( T.isString(base_dir), context + ':enable:bad base dir string')
					
					const json_full_path = path.join(base_dir, 'resources', self.file_name)
					// console.log(json_full_path, 'json_full_path')
					
					const storage = require('lowdb/lib/file-sync')
					self.file_db = lowdb(json_full_path, {storage})
					
					// console.log(self.file_db.object, 'self.file_db.object')
					// console.log( require(json_full_path), 'self.file_db JSON file')
					
					self.leave_group('enable (async:resolved)')
				}
			)
			resolved_promise.catch(
				(reason) => {
					self.leave_group('enable (async:error)')
					self.error('failed to load db file:' + reason)
					console.error('failed to load db file:' + reason)
				}
			)
		}
		
		this.leave_group('enable (async:waiting)')
		return resolved_promise
	}
	
	
	
	/**
	 * Disable authentication plugin with contextual informations.
	 * 
	 * @param {object|undefined} arg_settings - optional contextual settings.
	 * 
	 * @returns {object} - a promise object of a boolean result (success:true, failure:false)
	 */
	disable(arg_settings)
	{
		const resolved_promise = super.disable(arg_settings)
		return resolved_promise
	}
	
	
	
	/**
	 * Get a authentication middleware to use on servers (see Connect/Express middleware signature).
	 * 
	 * @param {boolean} arg_should_401 - should send an 401 error on authentication failure.
	 * @param {Function} arg_next_auth_mw - next authentication middleware.
	 * 
	 * @returns {Function} - function(request,response,next){...}
	 */
	create_middleware(arg_should_401, arg_next_auth_mw)
	{
		const self = this
		self.debug('create_middleware')
		// console.log('auth_lowdb_plugin.create_middleware')
		
		const auth_mgr = runtime.security().get_authentication_manager()
		
		return (req, res, next) => {
			try{
				const credentials = auth_mgr.get_credentials(req)
			} catch(e)
			{
				console.error(context + ':create_middleware:middleware:exception', e)
				self.error(context + ':create_middleware:middleware:exception', e)
				next('Authentication failure(exception)')
				return
			}
			
			// console.log('auth_lowdb_plugin.create_middleware', credentials)
				
			if ( auth_mgr.check_request_authentication(req) )
			{
				// console.log(context + ':auth_lowdb_plugin.create_middleware.request is already authenticated')
				self.debug('auth_lowdb_plugin.create_middleware.request is already authenticated')
				next()
				return
			}
			else
			{
				// console.log(context + ':auth_lowdb_plugin.create_middleware:not authenticated with credentials'/*, credentials*/)
				self.debug('auth_lowdb_plugin.create_middleware:not authenticated with credentials'/*, credentials*/)
			}
			
			
			this.authenticate(credentials)
			.then(
				(result) => {
					// console.log(context + ':auth_lowdb_plugin.create_middleware.authenticate then')
					self.debug('auth_lowdb_plugin.create_middleware.authenticate then')
					
					// SUCCESS
					if (result)
					{
						// console.log(context + ':auth_lowdb_plugin.create_middleware.authenticate then:next')
						self.debug('auth_lowdb_plugin.create_middleware.authenticate then:next')
						
						req.is_authenticated = true
						next()
						return
					}
					
					// FAILURE WITH ERROR
					if (arg_should_401)
					{
						// SEND OUTPUT
						res.status(401)
						res.contentType = 'json'
						res.send({ message: 'Authentication failure' })
						
						// console.log(context + ':auth_lowdb_plugin.create_middleware.authenticate then:auth failure')
						self.debug('auth_lowdb_plugin.create_middleware.authenticate then:auth failure')
						
						next('Authentication failure')
						return
					}
					
					// FAILURE WITHOUT ERROR
					// console.log(context + ':auth_lowdb_plugin.create_middleware.authenticate failure without error:next')
					self.debug('auth_lowdb_plugin.create_middleware.authenticate failure without error:next')
					
					if (arg_next_auth_mw)
					{
						arg_next_auth_mw(req, res, next)
						return
					}
					next()
					return
				}
			)
			.catch(
				(reason) => {
					// console.log(context + ':auth_lowdb_plugin.create_middleware.authenticate exception', reason)
					self.debug('auth_lowdb_plugin.create_middleware.authenticate exception', reason)
					
					// SEND OUTPUT
					res.status(401)
					res.contentType = 'json'
					res.send({ message: reason })
					
					next(reason)
				}
			)
		}
	}
	
	
	
	/**
	 * Authenticate a user with a file giving request credentials.
	 * 
	 * @param {Credentials|undefined} arg_credentials - request credentials object.
	 * 
	 * @returns {object} - a promise of boolean.
	 */
	authenticate(arg_credentials)
	{
		this.debug('authenticate')
		// console.log(arg_credentials, context + ':authenticate:arg_credentials')
		
		if (! this.file_db)
		{
			this.debug('authenticate:failure:bad db')
			return Promise.resolve(false)
		}
		// assert( T.isFunction(this.file_db), context + ':authenticate:bad db object')
		assert( T.isObject(arg_credentials) && arg_credentials.is_credentials, context + ':authenticate:bad credentials object')
		arg_credentials = arg_credentials.get_credentials()

		// HAS AUTHENTICATION INFORMATIONS
		if ( !(T.isString(arg_credentials.user_name) && T.isString(arg_credentials.user_pass_digest)) )
		{
			this.debug('authenticate:failure:no credentials', arg_credentials)
			return Promise.resolve(false)
		}
		// assert( T.isString(arg_credentials.user_name), context + ':authenticate:bad credentials.user_name string')
		// assert( T.isString(arg_credentials.user_pass_digest), context + ':authenticate:bad credentials.user_pass_digest string')
		
		// CREATE QUERY
		const username_field = this.username_fieldname ? this.username_fieldname : 'username'
		const password_field = this.id_password_fieldnamefieldname ? this.password_fieldname : 'password'
		let query = {}
		query[username_field] = arg_credentials.user_name
		query[password_field] = arg_credentials.user_pass_digest
		
		// EXECUTE QUERY
		try{
			// console.log(context + '.authenticate:db', this.file_db)
			// console.log(context + '.authenticate:db', this.file_db.object)
			// console.log(context + '.authenticate:query', query)
			
			const users = this.file_db('users').find(query)
			if (users)
			{
				const first_user = (T.isArray(users) && users.length > 0) ? users[0] : (T.isObject(users) ? users : null)
				if ( T.isFunction(arg_credentials.done_cb) )
				{
					arg_credentials.done_cb(first_user)
				}
				// console.log('authenticate user found')
				
				this.debug('authenticate:success')
				return Promise.resolve(true)
			}
		}
		catch(e)
		{
			console.error('authenticate user error', e)
		}
		
		// console.log('authenticate user NOT found')
		
		this.debug('authenticate:failure for', arg_credentials)
		return Promise.resolve(false)
	}
	
	
	
	/**
	 * Get user id from a user record.
	 * 
	 * @param {object} arg_user_record - user record object.
	 * 
	 * @returns {string} - user id.
	 */
	get_user_id(arg_user_record)
	{
		const id_field = this.id_fieldname ? this.id_fieldname : 'id'
		return ( T.isObject(arg_user_record) && (id_field in arg_user_record) ) ? arg_user_record[id_field] : null
	}
	
	
	
	/**
	 * Get user record by its id.
	 * 
	 * @param {string} arg_user_id - user id.
	 * 
	 * @returns {string} - user id.
	 */
	get_user_by_id(arg_user_id)
	{
		assert( T.isFunction(this.file_db), context + ':get_user_by_id:bad db object')
		
		// CREATE QUERY
		const id_field = this.id_fieldname ? this.id_fieldname : 'id'
		let query = {}
		query[id_field] = arg_user_id
		
		// EXECUTE QUERY
		try{
			let users = this.file_db('users').find(query)
			if (users)
			{
				return (T.isArray(users) && users.length > 0) ? users[0] : (T.isObject(users) ? users : null)
			}
		}
		catch(e)
		{
		}
		
		return null
	}
}
