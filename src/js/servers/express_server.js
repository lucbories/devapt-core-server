// NPM IMPORTS
import assert from 'assert'
import _ from 'lodash'
import express from 'express'
import http from 'http'
import socketio from 'socket.io'
import compression from 'compression'
// import helmet from 'helmet'
import favicon from 'express-favicon'
import path from 'path'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
import runtime from '../base/runtime'
import RoutableServer from './routable_server'
import MetricsMiddleware from '../metrics/http/metrics_http_collector'


const context = 'server/servers/express_server'



/**
 * @file Express server class.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class ExpressServer extends RoutableServer
{
	/**
	 * Create Express server instance.
	 * @extends RoutableServer
	 * 
	 * @param {string} arg_name - server name.
	 * @param {object} arg_settings - plugin settings map.
	 * @param {string} arg_log_context - trace context string.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_name, arg_settings, arg_log_context=context)
	{
		super(arg_name, 'ExpressServer', arg_settings, arg_log_context)
		
		this.is_express_server = true
	}
	

	
	/**
	 * Build private server instance.
	 * 
	 * @returns {nothing}
	 */
	build_server()
	{
		this.enter_group('build_server')
		
		// DEBUG
		// debugger
		
		assert( this.server_protocole == 'http' || this.server_protocole == 'https', context + ':bad protocole for express [' + this.server_protocole + ']')
		
		// CREATE SERVER
		this.info('build_server:create Express server')
		this.server = express()
		
		// USE COMPRESSED RESPONSE WITH GZIP
		this.info('build_server:use compression')
		this.server.use(compression())
		
		// USE SECURITY MIDDLEWARE (https://www.npmjs.com/package/helmet)
		this.info('build_server:use security')
		// this.server.use(helmet)
		this.server.disable('x-powered-by')
		
		
		// USE METRICS MIDDLEWARE
		this.info('build_server:use metrics')
		this.server.use( MetricsMiddleware.create_middleware(this) )
		
		
		// USE FAVICON MIDDLEWARE
		this.info('build_server:use favicon')
		const favicon_path = runtime.context.get_absolute_path('../../../public/favico.png')
		// console.log(favicon_path, 'favicon_path')
		this.server.use( favicon(favicon_path) )
		
		
		// BUILD SOCKETIO
		this.info('build_server:use socketio')
		const use_socketio = this.get_setting('use_socketio', false)

		// DEBUG
		this.debug('build_server:use socket io?', use_socketio)
		console.log(context + ':build_server:use socket io?', use_socketio)
		
		if (use_socketio)
		{
			// DEBUG
			this.debug('build_server:creating Express socket io')
			console.log(context + ':build_server:creating Express socket io')
			
			this.server_http = http.Server(this.server)
			this.serverio = socketio(this.server_http)
			
			runtime.add_socketio(this.get_name(), this.serverio)
		}

		
		// USE ALL MIDDLEWARES WITHOUT SECURITY
		this.info('build_server:use all middleware without security')
		this.services_without_security.forEach(
			(arg_record) => {
				this.info('build_server:activate service=' + arg_record.svc.get_name())
				arg_record.svc.activate_on_server(arg_record.app, this, arg_record.cfg)
			}
		)


		// USE AUTHENTICATION MIDDLEWARES
		this.info('build_server:apply authentication middlewares')
		this.authentication.apply_middlewares(this)
		
		
		// TODO: USE AUTHORIZATION MIDDLEWARE
		// this.server.use( this.authorization.create_middleware() )
		

		// USE ALL MIDDLEWARES WITH SECURITY
		this.info('build_server:use all middleware with security')
		this.services_with_security.forEach(
			(arg_record) => {
				arg_record.svc.activate_on_server(arg_record.app, this, arg_record.cfg)
			}
		)

		
		// DEFAULT VIEW ENGINE
		// this.server.use( express.bodyParser() )
		// this.server.set('views', runtime.context.get_absolute_path('jade'))
		this.server.set('views', path.join(runtime.context.get_base_dir(), '../../dist/jade') )
		this.server.set('view engine', 'jade')
		
		
		this.leave_group('build_server')
	}
	
	finaly()
	{
		// USE FILE NOT FOUND MIDDLEWARE
		this.server.use(
			function(req, res/*, next*/)
			{
				console.log('EXPRESS: FILE NOT FOUND', req.url)
				
				res.status(404)

				// SEND HTML RESPONSE
				if (req.accepts('html'))
				{
					res.render('404', { url: req.url })
					return
				}

				// SEND JSON RESPONSE
				if (req.accepts('json'))
				{
					res.send({ error: 'Not found' })
					return
				}

				// SEND PLAIN TEXT RESPONSE
				res.type('txt').send('URL Not found (no routes)')
			}
		)
		
		
		// USE BAD REQUEST MIDDLEWARE
		this.server.use(
			function(err, req, res, next)
			{
				// !!! RES COULD BE A http.ServerResponse AND NOT A Express.Response INSTANCE
				if (req.xhr)
				{
					res.status(500).send( { error: 'Something failed!' } )
				}
				else
				{
					next(err)
				}
			}
		)
		
		
		// USE ERROR MIDDLEWARE
		this.server.use(
			function(err, req, res/*, next*/)
			{
				console.log(req.url, 'request.url')
				console.error(err.stack)
				res.status(500)
				res.render('error', { error: err } )
			}
		)
		
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
		const self = this

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

		// DEBUG
		// console.log(context + ':get_middleware_for_static_route:express static route', arg_cfg_route)
		// console.log(context + ':ROUTE FOR ASSETS IN DIRECTORY MODE => dir_path=', dir_path)

		// STATIC OPTIONS
		const one_day = 86400000
		const static_cfg = {
			maxAge:one_day,
			redirect:false,
			fallthrough:true, // TRUE to run next middlewares to search not found fil on another route or to call call an error handler.
			setHeaders:undefined, // function
			extensions:T.isNotEmptyArray(arg_cfg_route.extensions) ? arg_cfg_route.extensions : false,
			index:arg_cfg_route.default
		}

		this.debug('get_middleware_for_static_route:route [' + arg_cfg_route.directory + ']')
		this.debug('get_middleware_for_static_route:dir_path [' + dir_path + ']')
		this.debug('get_middleware_for_static_route:route cfg [' + JSON.stringify(arg_cfg_route) + ']')

		return (req, res, next)=>{
			const asset_path = req._parsedUrl.pathname

			// DEBUG
			self.debug('get_middleware_for_static_route:mw callback:asset_path=[' + asset_path + '] directory=[' + arg_cfg_route.directory + ']')
			// console.log(context + ':get_middleware_for_static_route:express static middleware', arg_cfg_route.directory, req._parsedUrl, dir_path, asset_path)
			// debugger
			
			// TEST REQUIRED PREFIXES
			if ( T.isNotEmptyArray(arg_cfg_route.required_prefixes) )
			{
				let match = false
				_.forEach(arg_cfg_route.required_prefixes,
					(value)=>{
						if ( asset_path.startsWith(value) )
						{
							match = true
						}
					}
				)

				if (! match)
				{
					this.warn('get_middleware_for_static_route:not matching route prefix for ' + asset_path)
					console.warn(context + ':get_middleware_for_static_route:not matching route prefix for ' + asset_path)

					return next()
				}
			}
			
			// TEST REQUIRED SUFFIXES
			if ( T.isNotEmptyArray(arg_cfg_route.required_suffixes) )
			{
				let match = false
				_.forEach(arg_cfg_route.required_suffixes,
					(value)=>{
						if ( asset_path.endsWith(value) )
						{
							match = true
						}
					}
				)

				if (! match)
				{
					this.warn('get_middleware_for_static_route:not matching route suffix for ' + asset_path)
					console.warn(context + ':get_middleware_for_static_route:not matching route suffix for ' + asset_path)

					return next()
				}
			}

			req.url = req.url == '/' ? req.baseUrl : req.url
			
			return express.static(dir_path, static_cfg)(req, res, next)
		}
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

		const route = arg_cfg_route.route_regexp ? arg_cfg_route.route_regexp : arg_cfg_route.full_route
		this.debug('add_get_route:route [' + route + ']')

		assert( T.isObject(arg_cfg_route),  this.get_context() + ':add_get_route:bad route config object')
		assert( T.isFunction(arg_callback), this.get_context() + ':add_get_route:bad callback function for route [' + route + ']')
		assert( T.isString(route) || T.isRegExp(route), this.get_context() + ':add_get_route:bad route string|RegExp for config [' + JSON.stringify(arg_cfg_route) + ']')

		// CHECK EXPRESS SERVER
		if ( ! this.server || ! T.isFunction(this.server.use) )
		{
			this.leave_group('add_get_route:bad server error for route config [' + JSON.stringify(arg_cfg_route) + ']')
			return false
		}
		
		const safe_callback = (req, res, next)=>{
			try{
				console.log(this.get_context() + ':add_get_route:route cfg=' + JSON.stringify(arg_cfg_route))
				return arg_callback(req, res, next)
			}
			catch(err)
			{
				console.error(this.get_context() + ':add_get_route:error=' + err + ':route cfg=' + JSON.stringify(arg_cfg_route))
				return next(err)
			}
		}
		this.server.use(route, safe_callback)

		this.leave_group('add_get_route:[' + route + ']')
		return true
	}
}
