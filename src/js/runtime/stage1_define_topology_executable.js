// NPM IMPORTS

// COMMON IMPORTS
import T                   from 'devapt-core-common/dist/js/utils/types'
import JsonProviderFactory from 'devapt-core-common/dist/js/json_provider/json_provider_factory'
import TopologyDefineWorld from 'devapt-core-common/dist/js/topology/define/topology_define_world'

// SERVER IMPORTS
import PluginsFactory      from '../plugins/plugins_factory'
import RuntimeExecutable   from './runtime_executable'


let context = 'server/runtime/runtime_stage1_executable'



/**
 * @file Runtime Stage 1 loading class.
 * 
 * Runtime Stage 1 consists of:
 * 	  - get world topology definition settings from registry
 *	  - create world topology definition
 *    - load word topology definition
 * 
 * @author Luc BORIES
 * 
 * @license Apache-2.0
*/
export default class RuntimeStage1Executable extends RuntimeExecutable
{
	constructor(arg_logger_manager)
	{
		super(context, arg_logger_manager)
		this.$name = 'stage 1'
	}
	
	// TODO MONITOR EXECUTE PROMISE !!!
	execute()
	{
		const self = this
		
		// SAVE TRACES STATE
		const saved_trace = this.get_trace()
		const has_trace = true || this.runtime.get_setting(['trace', 'stages', 'RuntimeStage1', 'enabled'], false)
		// console.log(context + ':has_trace=', has_trace)
		if (has_trace)
		{
			this.enable_trace()
		}
		

		// EXECUTE ACTIONS
		this.separate_level_1()
		this.enter_group('execute')
		
		
		// GET REGISTRY SETTINGS PROVIDER
		this.info('Get registry settings provider')
		const settings_provider = this.runtime.get_setting('settings_provider', null)
		

		// GET WORLD TOPOLOGY SETTINGS
		let promise = null
		const runtime = this.runtime
		const logger_manager = this.runtime.get_logger_manager()
		if ( T.isObject(settings_provider) )
		{
			this.info('Settings provider found for master')
			
			const provider = JsonProviderFactory.create( settings_provider.set('runtime', runtime) )
			if (! provider)
			{
				throw 'bad settings provider config.'
			}
			promise = provider.provide_json()
			.then(
				// SUCCESS
				function(arg_json)
				{
					self.info('Dispatching master settings into store')
					
					// console.log(arg_json, 'arg_json')

					const base_dir = runtime.get_setting('base_dir', undefined)
					const topology_dir = runtime.get_setting('world_dir', undefined)
					const load_registry = runtime.get_registry().load(arg_json, base_dir, topology_dir)
					if ( ! load_registry)
					{
						const error = runtime.get_registry().get_error()
						const str = runtime.get_registry().format_error(error)
						console.error(context + ':runtime.topology_registry.load:error', str)
						self.error(context + ':runtime.topology_registry.load:error:' + str)
						return false
					}
					
					return true
				}
			)
			.catch(
				// FAILURE
				function(arg_reason)
				{
					self.error(context + ':Master settings loading failure:' + arg_reason)
					return false
				}
			)
		}
		else
		{
			this.error('Settings provider not found')
			promise = Promise.reject('Settings provider not found for master')
		}

		
		// DEFINE WORLD TOPOLOGY
		this.info('CREATE WORLD TOPOLOGY ITEM')
		promise = promise.then(
			function()
			{
				// LOAD TRACES SETTINGS
				// self.info('Load traces settings')
				// const traces_settings = runtime.get_registry().root.get('traces').toJS()
				// logger_manager.load(traces_settings)
				// runtime.update_trace_enabled()
				// runtime.node.update_trace_enabled()
				// runtime.node.update_trace_enabled_stage_1()

				// CREATE PLUGINS MANAGERS
				self.info('Creating plugins manager')
				runtime.plugins_factory = new PluginsFactory(runtime)
			}
		)
		.catch(
			// FAILURE
			function(arg_reason)
			{
				self.error(context + ':World creation and loading failure:Creating plugins manager:' + arg_reason)
				console.error(context + ':World creation and loading failure:Creating plugins manager:' + arg_reason)
				return false
			}
		)
		.then(
			function()
			{
				// GET REGISTRY SETTINGS
				self.info('Get world definition settings from registry')
				const world_settings = {
					nodes:runtime.get_registry().root.get('nodes').toJS(),
					tenants:runtime.get_registry().root.get('tenants').toJS(),
					plugins:runtime.get_registry().root.get('plugins').toJS(),
					security:runtime.get_registry().root.get('security').toJS(),
					loggers:runtime.get_registry().root.get('loggers').toJS(),
					traces:runtime.get_registry().root.get('traces').toJS()
				}

				// CREATE WORLD TOPOLOGY DEFINITION ROOT
				self.info('Creating world topology definition root')
				runtime.defined_world_topology = new TopologyDefineWorld('world', world_settings, runtime, logger_manager)
				
				runtime.update_trace_enabled()
				runtime.node.update_trace_enabled()
				runtime.node.update_trace_enabled_stage_1()
			}
		)
		.catch(
			// FAILURE
			function(arg_reason)
			{
				self.error(context + ':World creation and loading failure:Creating world topology definition root:' + arg_reason)
				console.error(context + ':World creation and loading failure:Creating world topology definition root:' + arg_reason)
				return false
			}
		)
		.then(
			function()
			{
				// LOAD WORLD TOPOLOGY DEFINITION
				self.info('Loading world topology definition')
				return runtime.defined_world_topology.load()
			}
		)
		.catch(
			// FAILURE
			function(arg_reason)
			{
				self.error(context + ':World creation and loading failure:Loading world topology definition:' + arg_reason)
				console.error(context + ':World creation and loading failure:Loading world topology definition:' + arg_reason)
				return false
			}
		)
		
		this.leave_group('execute')
		this.separate_level_1()
		
		
		// RESTORE TRACES STATE
		if (! saved_trace && has_trace)
		{
			this.disable_trace()
		}
		
		return promise
	}
}
