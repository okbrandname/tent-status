TentStatus.Routers.profile = new class ProfileRouter extends Marbles.Router
  routes: {
    "profile" : "currentProfile"
    ":entity/profile" : "profile"
  }

  actions_titles: {
    "currentProfile" : "Profile"
    "profile" : "Profile"
  }

  _initMiniProfileView: (options = {}) =>
    new Marbles.Views.MiniProfile _.extend options,
      el: document.getElementById('author-info')

  currentProfile: (params) =>
    if TentStatus.Helpers.isAppSubdomain()
      return @navigate('/global', {trigger:true, replace: true})

    new Marbles.Views.Profile entity: TentStatus.config.domain_entity.toString()
    @_initMiniProfileView()
    TentStatus.setPageTitle page: @actions_titles.currentProfile

    TentStatus.initBackgroundMentionsCursor()
    TentStatus.initBackgroundMentionsUnreadCount()

  profile: (params) =>
    if TentStatus.Helpers.isAppSubdomain()
      return @navigate('/global', {trigger:true, replace: true})

    new Marbles.Views.Profile entity: params.entity
    @_initMiniProfileView()

    title = @actions_titles.profile
    title = "#{TentStatus.Helpers.formatUrlWithPath(params.entity)} - #{title}" if params.entity
    TentStatus.setPageTitle page: title

    TentStatus.initBackgroundMentionsCursor()
    TentStatus.initBackgroundMentionsUnreadCount()