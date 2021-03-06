Marbles.Views.ConversationComponent = class ConversationComponentView extends Marbles.View
  postView: =>
    @findParentView('post')

  post: =>
    return unless post_view = @postView()
    repost_view = _.last(post_view.childViews('Repost') || [])
    (repost_view || post_view).post()

  postContext: =>
    _.extend Marbles.Views.Post::context(arguments...),
      is_conversation_view: true

  renderPostHTML: =>
    Marbles.Views.PostsFeed::renderPostHTML.apply(@, arguments)

  renderHTML: (posts) =>
    html = ""
    for post in posts
      html += @renderPostHTML(post)
    html

  prependRender: =>
    Marbles.Views.PostsFeed::prependRender.apply(@, arguments)

  appendRender: =>
    Marbles.Views.PostsFeed::appendRender.apply(@, arguments)

  fetchPost: (params, callback) =>
    TentStatus.Models.Post.find(params, { success: callback })
