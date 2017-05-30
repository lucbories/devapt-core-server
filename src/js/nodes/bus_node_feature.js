// NPM IMPORTS
// import assert from 'assert'
import { fromJS } from 'immutable'

// COMMON IMPORTS
// import T                 from 'devapt-core-common/dist/js/utils/types'
import StreamBusEngine   from 'devapt-core-common/dist/js/messaging/stream_bus_engine'
import SocketIOBusEngine from 'devapt-core-common/dist/js/messaging/socketio_bus_engine'
import MessageBus        from 'devapt-core-common/dist/js/messaging/message_bus'

// SERVER IMPORTS
import NodeFeature from './node_feature'



let context = 'server/nodes/bus_node_feature'



/**
 * Node feature: manages a bus.
 * 
 * @author Luc BORIES
 * @license Apache-2.0
 * 
 * @example
 * 	Bus engine format:
 * 		{
 * 			package:'default' or 'my bus engine NPM package',
 * 			type:'Server' or 'Client',
 * 			protocole:'http' or 'https,
 * 			host:'...',
 * 			port:'...',
 * 			settings:{} // optional
 * 		}
 */
export default class BusNodeFeature extends NodeFeature
{
	/**
	 * Create a BusNodefeature instance.
	 * 
	 * @param {Node} arg_node - node instance.
	 * @param {string} arg_name - feature name.
	 * 
	 * @returns {nothing}
	 */
	constructor(arg_node, arg_name)
	{
		super(arg_node, arg_name)
		
		/**
		 * Class type flag.
		 * @type {boolean}
		 */
		this.is_bus_node_feature = true
		
		/**
		 * Feature bus instance.
		 * @type {MessageBus}
		 */
		this.bus = undefined
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
		const default_bus_protocole = 'https'

		const bus_name = this.get_name()
		const bus_pkg  = this.node.get_setting(['master', bus_name, 'package'], default_bus_package)
		
		let engine_settings = this.node.get_setting(['master', bus_name, 'settings'], fromJS({}) )
		engine_settings = engine_settings.set('runtime',   this.node.get_runtime())
		engine_settings = engine_settings.set('type',      this.node.get_setting(['master', bus_name, 'type'], default_bus_type) )
		engine_settings = engine_settings.set('protocole', this.node.get_setting(['master', bus_name, 'protocole'], default_bus_protocole) )
		engine_settings = engine_settings.set('host',      this.node.get_setting(['master', bus_name, 'host'], undefined) )
		engine_settings = engine_settings.set('port',      this.node.get_setting(['master', bus_name, 'port'], undefined) )

		let bus_engine = undefined
		if (bus_pkg == 'default')
		{
			bus_engine = new StreamBusEngine(bus_name + '_engine', engine_settings, context, this.node.get_logger_manager())
		} else if (bus_pkg == 'socketio')
		{
			bus_engine = new SocketIOBusEngine(bus_name + '_engine', engine_settings, context, this.node.get_logger_manager())
		} else {
			bus_engine = this.create_bus_engine(bus_pkg, bus_name + '_engine', engine_settings)
		}

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
			const pkg_path = this.node.get_runtime().get_context().get_absolute_package_path(arg_package)
			// console.log(context + ':create_bus_engine:pkg_path=[%s]', pkg_path)
			
			let pkg = require(pkg_path)
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
			console.warn(context + ':create_bus_engine:bad package name for bus engine:' + arg_package + ' with error:' + e.toString())
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

		// DEBUG
		// console.log(context + ':load:name=%s this.bus', this.get_name(), this.bus.get_name())

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
}
