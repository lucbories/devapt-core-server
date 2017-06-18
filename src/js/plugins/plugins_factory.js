// NPM IMPORTS
import assert from 'assert'

// COMMON IMPORTS
import T from 'devapt-core-common/dist/js/utils/types'

// SERVER IMPORTS
// import DefaultServicePlugin from '../default_plugins/services_default_plugin'
import ServicesManager from './services_manager'
import RenderingManager from './rendering_manager'


const context = 'server/plugins/plugins_factory'




/**
 * Plugin class for renderers plugin.
 * @author Luc BORIES
 * @license Apache-2.0
 */
export default class PluginsFactory
{
    /**
     * Create a PluginsFactory instance.
	 * @returns {nothing}
     */
	constructor(arg_runtime)
	{
		this.is_plugins_factory = true
		
		assert( T.isObject(arg_runtime) && arg_runtime.is_base_runtime, context + ':constructor:bad runtime instance' )

		// SERVICES PLUGINS MANAGER
		this.services_manager = new ServicesManager(arg_runtime, context, arg_runtime.get_logger_manager())
		
		
		// RENDERING PLUGINS MANAGER
		const plugins = []
		this.rendering_manager = new RenderingManager(arg_runtime, context, arg_runtime.get_logger_manager())
		this.rendering_manager.load(plugins)
	}
	
	
	/**
	 * Get services plugins manager.
	 * @returns {FeaturesManager}
	 */
	get_services_manager()
	{
		assert( T.isObject(this.services_manager), context + ':get_services_manager:bad services manager object')
		return this.services_manager
	}
	
	
	/**
	 * Get rendering plugins manager.
	 * @returns {FeaturesManager}
	 */
	get_rendering_manager()
	{
		assert( T.isObject(this.rendering_manager), context + ':get_rendering_manager:bad rendering manager object')
		return this.rendering_manager
	}
}
