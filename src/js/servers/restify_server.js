// NPM IMPORTS
import assert from 'assert'
import restify from 'restify'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import RoutableServer from './routable_server'
import MetricsMiddleware from '../metrics/http/metrics_http_collector'


let context = 'server/servers/restify_server'



/**
 * @file Restify server class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class RestifyServer extends RoutableServer
{
	/**
	 * Create Restify server instance.
	 * @extends RoutableServer
	 * 
	 * @param {string} arg_name - server name
	 * @param {object} arg_settings - plugin settings map
	 * @param {string} arg_log_context - trace context string.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_name, arg_settings, arg_log_context=context)
	{
		super(arg_name, 'RestifyServer', arg_settings, arg_log_context)
		
		this.is_restify_server = true
	}
	

	
	/**
	 * Build private server instance.
	 * 
	 * @returns {nothing}
	 */
	build_server()
	{
		this.enter_group('build_server')
		
		assert( this.server_protocole == 'http' || this.server_protocole == 'https', context + ':bad protocole for restify [' + this.server_protocole + ']')
		
		// CREATE REST SERVER
		const server_settings = {}
		this.server = restify.createServer(server_settings)
		let server = this.server

		
		// METRICS MIDDLEWARE
		server.use( MetricsMiddleware.create_middleware(this) )


		// USE ALL MIDDLEWARES WITHOUT SECURITY
		this.services_without_security.forEach(
			(arg_record) => {
				arg_record.svc.activate_on_server(arg_record.app, this, arg_record.cfg)
			}
		)


		// USE AUTHENTICATION MIDDLEWARES
		this.authentication.apply_middlewares(this)
		
		
		// TODO: USE AUTHORIZATION MIDDLEWARE
		// this.server.use( this.authorization.create_middleware() )
		

		// USE ALL MIDDLEWARES WITH SECURITY
		this.services_with_security.forEach(
			(arg_record) => {
				arg_record.svc.activate_on_server(arg_record.app, this, arg_record.cfg)
			}
		)
        
		
		// TODO: LOAD MIDDLEWARES FROM SETTINGS
		
		
		// SET MIDDLEWARES
		const throttle_settings = {
			burst: 100,
			rate: 50,
			ip: true,
			overrides: {
				'192.168.1.1': {
					rate: 0,        // unlimited
					burst: 0
				}
			}
		}
		
		// var acceptable = server.acceptable.concat(['application/x-es-module */*', 'application/x-es-module']);
		// console.log(acceptable, 'acceptable');
		// server.use(restify.acceptParser(acceptable));
		server.use( restify.acceptParser(server.acceptable) )
		
		server.use( restify.authorizationParser()) 
		server.use( restify.queryParser() )
		server.use( restify.jsonp() )
		server.use( restify.gzipResponse() )
		server.use( restify.bodyParser() )
		server.use( restify.requestLogger() )
		server.use( restify.throttle(throttle_settings) )
		
        
		// ERROR HANDLING
		server.on('InternalServerError',
			function (req, res, err, cb)
			{
				console.error(err, 'Internal server error');
				err._customContent = 'something is wrong!';
				return cb();
			}
		)
		
        
		// ENABLE / DISABLE AUDIT LOGS
		// const audit_settings = {
		// 	log: bunyan.createLogger(
		// 		{
		// 			name: 'audit',
		// 			stream: process.stdout
		// 		}
		// 	)
		// }
		// server.on('after', restify.auditLogger(audit_settings) )
		
		
		// SET URL
		this.server_url = this.server_protocole + '//' + this.server_host + ':' + this.server_port
		
		
		this.leave_group('build_server')
	}
	
	
	
	/**
	 * Get server middleware for static route.
	 * 
     * @param {object} arg_cfg_route - plain object route configuration.
	 * 
	 * @returns {middleware} - middleware function as f(req, res, next)
	 */
	get_middleware_for_static_route(arg_cfg_route)
	{
		// DEBUG
		console.log(context + ':get_middleware_for_static_route:express static route', arg_cfg_route)


		// SEARCH ASSETS DIRECTORY
		let dir_path = undefined
		if ( path.isAbsolute(arg_cfg_route.directory) )
		{
			dir_path = arg_cfg_route.directory
		}
		if ( ! dir_path && T.isNotEmptyString(arg_cfg_route.pkg_base_dir) )
		{
			dir_path = runtime.context.get_absolute_path(arg_cfg_route.pkg_base_dir, arg_cfg_route.directory)
		}
		if ( ! dir_path && T.isNotEmptyString(arg_cfg_route.app_base_dir) )
		{
			dir_path = runtime.context.get_absolute_path(arg_cfg_route.app_base_dir, '../public', arg_cfg_route.directory)
		}
		if ( ! dir_path )
		{
			dir_path = runtime.context.get_absolute_public_path(arg_cfg_route.directory)
		}

		const cb_arg = {
			directory: dir_path
		}

		if ( T.isString(arg_cfg_route.default_file) )
		{
			cb_arg.default = arg_cfg_route.default_file
		}

		// DEBUG
		// console.log(cb_arg, 'restify route cfg')
		// console.log('restify static route', arg_cfg_route.directory)
		
		return restify.serveStatic(cb_arg)
	}
	
	
	
	/**
	 * Get server middleware for directory route.
	 * 
     * @param {object}   arg_cfg_route - plain object route configuration.
	 * @param {function} arg_callback - route handler callback.
	 * 
	 * @returns {boolean} - success or failure.
	 */
	add_get_route(arg_cfg_route, arg_callback)
	{
		this.enter_group('add_get_route')

		assert( T.isObject(arg_cfg_route), this.get_context() + '::bad route config object')
		assert( T.isString(arg_cfg_route.full_route), this.get_context() + '::bad route config full_route string')
		assert( T.isFunction(arg_callback), this.get_context() + '::bad string')

		// CHECK EXPRESS SERVER
		if ( ! this.server || ! T.isFunction(this.server.use) )
		{
			this.leave_group('add_get_route:bad server error')
			return false
		}
		
		this.server.get(arg_cfg_route.full_route, arg_callback)
		
		this.leave_group('add_get_route')
		return true
	}
}
