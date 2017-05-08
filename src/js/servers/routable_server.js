// NPM IMPORTS
// import assert from 'assert'
// import { fromJS } from 'immutable'

// COMMON IMPORTS
// import T           from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import Server from './server'


const context = 'server/servers/routable_server'



/**
 * @file Server base class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class RoutableServer extends Server
{
	/**
	 * Base class for a routable server instance.
	 * @extends Server
	 * 
	 * 	API:
	 * 		->constructor(arg_name, arg_class, arg_settings, arg_log_context=context)
	 * 
	 * 		->load():nothing - Load server settings.
	 * 
	 * 		->enable():nothing - Enable server (start it).
	 * 		->disable():nothing - Disable server (stop it).
	 * 
	 * 		->get_middleware_for_static_route():middleware - Get server middleware for static route.
	 * 
	 * 		->add_get_route(arg_cfg_route, arg_callback):boolean - Get server middleware for directory route.
	 * 
	 * @param {string} arg_name - server name.
	 * @param {string} arg_class - server class name.
	 * @param {object} arg_settings - plugin settings map.
	 * @param {string} arg_log_context - trace context string.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_name, arg_class, arg_settings, arg_log_context=context)
	{
		super(arg_name, arg_class, arg_settings, arg_log_context)
		
		this.is_routable_server = true
	}

	
	
	
	/**
	 * Enable server (start it).
	 * 
	 * @returns {nothing}
	 */
	enable()
	{
		super.enable()
	}
	
	
	
	/**
	 * Disable server (stop it).
	 * 
	 * @returns {nothing}
	 */
	disable()
	{
		super.disable()
	}
	
	
	
	/**
	 * Get server middleware for static route.
	 * 
     * @param {object} arg_cfg_route - plain object route configuration.
	 * 
	 * @returns {middleware} - middleware function as f(req, res, next)
	 */
	get_middleware_for_static_route()
	{
		return (req, res, next)=>{ return next ? next() :undefined }
	}
	
	
	
	/**
	 * Get server middleware for directory route.
	 * 
     * @param {object}   arg_cfg_route - plain object route configuration.
	 * @param {function} arg_callback - route handler callback.
	 * 
	 * @returns {boolean} - success or failure.
	 */
	add_get_route(/*arg_cfg_route, arg_callback*/)
	{
		return false
	}
}
