// NPM IMPORTS
// import assert from 'assert'
import { fromJS } from 'immutable'

// COMMON IMPORTS
// import T                 from 'devapt-core-common/dist/js/utils/types'
import StreamBusEngine   from 'devapt-core-common/dist/js/messaging/stream_bus_engine'
import MessageBus        from 'devapt-core-common/dist/js/messaging/message_bus'

// SERVER IMPORTS
import NodeFeature from './node_feature'



let context = 'server/nodes/bus_node_feature'



/**
 * @file Node feature: manages a bus.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class BusNodeFeature extends NodeFeature
{
	/**
	 * Create a BusNodefeature instance.
	 * @extends NodeFeature
	 * 
	 * @param {Node} arg_node - node instance.
	 * @param {string} arg_name - feature name.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_node, arg_name)
	{
		super(arg_node, arg_name)
		
		this.is_bus_node_feature = true
		
		this.bus = undefined
		this.bus_gateway = undefined
		this.started_promise = undefined
	}


	/**
	 * Get bus name.
	 * 
	 * @returns {string} - unique bus name: node name + '_' + feature bus name
	 */
	get_bus_unique_name()
	{
		return this.node.get_name() + '_' + this.get_name()
	}



	/**
	 * Create bus from settings.
	 * 
	 * @returns {MessageBus} - created bus messages.
	 */
	create_message_bus()
	{
		const default_bus_package = 'default'
		const default_bus_type = this.node.is_master ? 'Server' : 'Client'

		const bus_name = this.get_name()
		const bus_pkg  = this.node.get_setting(['master', bus_name, 'package'], default_bus_package)
		
		let engine_settings = this.node.get_setting(['master', bus_name, 'settings'], fromJS({}) )
		engine_settings = engine_settings.set('runtime', this.node._runtime)
		engine_settings = engine_settings.set('type', this.node.get_setting(['master', bus_name, 'type'], default_bus_type) )
		engine_settings = engine_settings.set('host', this.node.get_setting(['master', bus_name, 'host'], undefined) )
		engine_settings = engine_settings.set('port', this.node.get_setting(['master', bus_name, 'port'], undefined) )

		const bus_engine = bus_pkg == 'default' ? new StreamBusEngine(bus_name + '_engine', engine_settings, context, this.node.get_logger_manager()) : this.create_bus_engine(bus_pkg, bus_name + '_engine', engine_settings)
		
		// CREATE MESSAGES BUS FOR INTRA NODES COMMUNICATION
		const bus_settings = { runtime:this.node._runtime, logger_manager:this.node.get_logger_manager() }
		
		return new MessageBus(this.get_bus_unique_name(), bus_engine, bus_settings, context)
	}



	/**
	 * Create a bus engine.
	 * 
	 * @param {string} arg_package  - class package name.
	 * @param {string} arg_name - bus engine name.
	 * @param {object} arg_settings - bus engine settings.
	 * 
	 * @returns {BusEngine} - Bus engine instance
	 */
	create_bus_engine(arg_package, arg_name, arg_settings)
	{
		try
		{
			// GET PACKAGE
			let pkg = require(arg_package)
			if (! pkg)
			{
				return undefined
			}
			if (pkg.default)
			{
				pkg = pkg.default
			}

			// CHECK TYPE
			if (! ('BusEngine' in pkg) )
			{
				return undefined
			}

			// GET CLASS
			const pkg_class = pkg['BusEngine']
			if (! pkg_class)
			{
				return undefined
			}

			return new pkg_class(arg_name, arg_settings, context, this.node.get_logger_manager())
		}
		catch(e)
		{
			console.warn('bad package name for bus engine:' + arg_package + ' with error:' + e.toString())
		}

		return undefined
	}
	

	
	/**
	 * Load Node settings.
	 * 
	 * @returns {nothing}
	 */
	load()
	{
		// const self = this
		this.node.enter_group(':BusNodeFeature.load()')
		
		if (this.bus)
		{
			this.node.leave_group(':BusNodeFeature.load():already loaded')
			return
		}

		super.load()
		
		this.bus = this.create_message_bus()
		console.log(context + ':load:name=%s this.bus', this.get_name(), this.bus.get_name())
		this.node.enable_on_bus(this.bus, 'default', 'receive_msg')

		// CREATE MESSAGES GATEWAY FOR INTER NODES COMMUNICATION
		/*if ( T.isString(bus_pkg) && T.isString(bus_type) && bus_host && bus_port)
		{
			if (bus_type != 'local')
			{
				const gw_settings = this.node.get_setting_js(['master', bus_name])
				gw_settings.runtime = this.node._runtime
				gw_settings.logger_manager = this.node.get_logger_manager()
				const gw_name = this.get_bus_unique_name() + '_gateway'
				
				// console.log(context + ':load:bus_type != local and gw_settings=%o', gw_settings)

				this.bus_gateway = this.create_bus_gateway(bus_pkg, bus_type, gw_name, gw_settings, context)
				assert( T.isObject(this.bus_gateway), context + ':bad bus gateway instance')
				const gw_started_promise = this.bus_gateway.enable()

				assert(gw_started_promise, context + ':load:bad gateway started promise')
				
				this.started_promise = this.bus_gateway.started_promise.then(
					() => {

						self.bus_gateway.add_locale_bus(self.bus)
						self.bus.add_gateway(self.bus_gateway)

						assert( T.isFunction(self.bus_gateway.subscribe), context + ':load:bad self.bus_gateway.subscribe function')
						self.bus_gateway.subscribe(self.node.get_name())

						if (! self.node.is_master)
						{
							self.bus_gateway.add_remote_target(self.node.master_name)
							self.node.remote_nodes[self.node.master_name] = self.node.get_setting_js(['master'])
						}
					}
				)
			}
		}*/
		
		this.node.leave_group(':BusNodeFeature.load()')
	}
	
	
	
	/**
	 * Starts node bus.
	 * 
	 * @returns {nothing}
	 */
	start()
	{
		this.node.enter_group(':BusNodeFeature.start')
		
		
		this.node.leave_group(':BusNodeFeature.start')
	}
	
	
	
	/**
	 * Stops node bus.
	 * 
	 * @returns {nothing}
	 */
	stop()
	{
		this.node.enter_group(':BusNodeFeature.stop')
		
		
		this.node.leave_group(':BusNodeFeature.stop')
	}
	
	
	
	/**
	 * Create a bus gateway.
	 * 
	 * @param {string} arg_gw_pkg  - gateway class package name.
	 * @param {string} arg_gw_type - gateway type (Client or Server).
	 * @param {string} arg_gw_name - gateway name.
	 * @param {object} arg_gw_settings - gateway settings.
	 * 
	 * @returns {BusGateway} - BusClient or BusServer instance
	 */
/*	create_bus_gateway(arg_gw_pkg, arg_gw_type, arg_gw_name, arg_gw_settings)
	{
		try
		{
			// GET PACKAGE
			let pkg = require('../../../../' + arg_gw_pkg)
			if (! pkg)
			{
				return undefined
			}
			if (pkg.default)
			{
				pkg = pkg.default
			}

			// CHECK TYPE
			if (! (arg_gw_type in pkg) )
			{
				return undefined
			}

			// GET CLASS
			const pkg_class = pkg[arg_gw_type]
			if (! pkg_class)
			{
				return undefined
			}

			return new pkg_class(arg_gw_name, arg_gw_settings, context)
		}
		catch(e)
		{
			console.warn('bad package name for bus gateway:' + arg_gw_pkg + ' with error:' + e.toString())
		}

		return undefined
	}*/
}
