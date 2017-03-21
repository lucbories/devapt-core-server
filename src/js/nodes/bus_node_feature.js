// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T                 from 'devapt-core-common/dist/js/utils/types'
import Bus               from 'devapt-core-common/dist/js/messaging/bus'

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
	 * Load Node settings.
	 * 
	 * @returns {nothing}
	 */
	load()
	{
		const self = this
		this.node.enter_group(':BusNodeFeature.load()')
		
		if (this.bus)
		{
			this.node.leave_group(':BusNodeFeature.load():already loaded')
			return
		}

		super.load()
		
		const default_bus_package = 'devapt-features-queuelibbus'
		const default_bus_type = this.node.is_master ? 'Server' : 'Client'

		const bus_name = this.get_name()
		const bus_pkg  = this.node.get_setting(['master', bus_name, 'package'], default_bus_package)
		const bus_type = this.node.get_setting(['master', bus_name, 'type'], default_bus_type)
		const bus_host = this.node.get_setting(['master', bus_name, 'host'], undefined)
		const bus_port = this.node.get_setting(['master', bus_name, 'port'], undefined)

		// CREATE MESSAGES BUS FOR INTRA NODES COMMUNICATION
		const bus_settings = {}
		this.bus = new Bus(this.get_bus_unique_name(), bus_settings, context)
		this.node.enable_on_bus(this.bus)

		// CREATE MESSAGES GATEWAY FOR INTER NODES COMMUNICATION
		if ( T.isString(bus_pkg) && T.isString(bus_type) && bus_host && bus_port)
		{
			if (bus_type != 'local')
			{
				const gw_settings = this.node.get_setting_js(['master', bus_name])
				const gw_name = this.get_bus_unique_name() + '_gateway'
				
				// console.log(context + ':load:bus_type != local and gw_settings=%o', gw_settings)

				this.bus_gateway = this.create_bus_gateway(bus_pkg, bus_type, gw_name, gw_settings, context)
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
		}
		
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
	create_bus_gateway(arg_gw_pkg, arg_gw_type, arg_gw_name, arg_gw_settings)
	{
		try
		{
			// GET PACKAGE
			let pkg = require(arg_gw_pkg)
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
	}
}
