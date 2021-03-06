Marbles.Views.Conversation = class ConversationView extends Marbles.View
  @template_name: 'conversation'
  @view_name: 'conversation'

  constructor: (options = {}) ->
    super(_.extend({render_method:'replace'}, options))

    @el = document.createElement('div')
    Marbles.DOM.insertBefore(@el, @parentView().el)

    @render()

  destroy: =>
    @detachChildViews()
    Marbles.DOM.removeNode(@el)
    @detach()

