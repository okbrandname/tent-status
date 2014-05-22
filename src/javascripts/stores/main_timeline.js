//= require ../dispatcher

(function () {
"use strict";

Micro.Stores.MainTimeline = {};

Marbles.Utils.extend(Micro.Stores.MainTimeline, {
	dispatcherIndex: Micro.Dispatcher.register(function (event) {
		switch (event.name) {
			case "unloadPage":
				this.unloadPage(event.pageId);
			break;

			case "loadPrevPage":
				this.fetchPrevPage();
			break;

			case "loadNextPage":
				this.fetchNextPage();
			break;
		}
	}.bind(Micro.Stores.MainTimeline)),

	getPage: function () {
		if (this.__cold) {
			this.__cold = false;
			this.__state = this.__getInitialState();
			this.__fetch();
		}

		var posts = [];
		this.__state.pages.forEach(function (page) {
			posts = posts.concat(page.posts);
		});

		return {
			posts: posts,
			profiles: this.__state.profiles,
			pageIds: this.__state.pageIds
		};
	},

	fetchPrevPage: function (opts) {
		var params = Marbles.QueryParams.deserializeParams(this.__pageQueries.prev);
		this.__fetch(params, Marbles.Utils.extend({}, opts, {
			operation: "prepend"
		}));
	},

	fetchNextPage: function (opts) {
		var params = Marbles.QueryParams.deserializeParams(this.__pageQueries.next);
		this.__fetch(params, Marbles.Utils.extend({}, opts, {
			operation: "append"
		}));
	},

	unloadPage: function (unloadPageId) {
		var pageIds = this.__state.pageIds;
		var pages = this.__state.pages;
		var pageQueries = this.__pageQueries;

		if (pageIds.length === 1) {
			throw new Error("MainTimeline: Invalid unload request for page id: "+ JSON.stringify(unloadPageId) +". Can not remove only loaded page.");
		}

		if (pageIds[0] === unloadPageId) {
			pageIds.shift();
			pages.shift();
			pageQueries.prev = pages[0].pageQueries.prev;
		} else {
			if (pageIds[pageIds.length-1] === unloadPageId) {
				pageIds.pop();
				pages.pop();
				pageQueries.next = pages[pages.length-1].pageQueries.next;
			} else {
				throw new Error("MainTimeline: Invalid unload request for page id: "+ JSON.stringify(unloadPageId) +". Only "+ JSON.stringify(pageIds[0]) +" or "+ JSON.stringify(pageIds[pageIds.length-1]) +" may be removed.");
			}
		}

		this.__setState({
			pages: pages,
			pageIds: pageIds
		});
	},

	setCold: function () {
		this.__cold = true;
		this.__state = this.__getInitialState();
	},

	addChangeListener: function (handler) {
		this.__changeListeners.push(handler);
	},

	removeChangeListener: function (handler) {
		this.__changeListeners = this.__changeListeners.filter(function (fn) {
			return fn !== handler;
		});
	},

	__changeListeners: [],

	__cold: true,

	__pageQueries: {},

	__state: {},

	__getInitialState: function () {
		return {
			profiles: {},
			pages: [],
			pageIds: []
		};
	},

	__setState: function (state) {
		var __state = this.__state;
		var __hasOwnProp = Object.hasOwnProperty;
		for (var k in state) {
			if (__hasOwnProp.call(state, k)) {
				__state[k] = state[k];
			}
		}
		this.__state = __state;
		this.__handleChange();
	},

	__handleChange: function () {
		this.__changeListeners.forEach(function (handler) {
			handler();
		});
	},

	__fetch: function (params, opts) {
		var config = Micro.config;
		params = params || [{}];
		opts = opts || {};
		var operation = opts.operation || "append";
		if (operation !== "append" && operation !== "prepend") {
			throw new Error("MainTimeline: Invalid operation: "+ JSON.stringify(operation) +". Expected \"append\" or \"prepend\"!");
		}
		params = Marbles.QueryParams.replaceParams.apply(null, [[{
			types: [
				config.POST_TYPES.STATUS,
				config.POST_TYPES.STATUS_REPLY,
				config.POST_TYPES.STATUS_REPOST
			],
			limit: Micro.config.PER_PAGE,
			profiles: "entity"
		}]].concat(params));
		var getPostsFeed = new Promise(function (resolve, reject) {
			Micro.client.getPostsFeed({
				params: params,
				callback: {
					success: resolve,
					failure: function (res, xhr) {
						reject([res, xhr]);
					}
				}
			});
		});
		getPostsFeed.then(
			this.__handleFetchSuccess.bind(this, opts, operation),
			this.__handleFetchFailure.bind(this)
		);
	},

	__handleFetchSuccess: function (opts, operation, res) {
		var profiles = res.profiles || {};
		Object.keys(profiles).forEach(function (entity) {
			var profile = profiles[entity];
			profile.avatarDigest = profile.avatar_digest;
			delete profile.avatar_digest;
			profile.entity = entity;
		});

		var pageIds = this.__state.pageIds;
		var pages = this.__state.pages;

		var pageQueries = this.__pageQueries;
		if (operation === "append") {
			pageQueries.next = res.pages.next || null;
		} else { // prepend
			var since;
			if (res.posts.length > 0) {
				var firstPost = res.posts[0];
				since = (firstPost.received_at || firstPost.published_at) +" "+ firstPost.version.id;
			} else {
				since = Date.now();
			}
			pageQueries.prev = res.pages.prev || ("?since="+ since);
		}

		// Don't add an empty page
		if (res.posts.length === 0) {
			this.__handleChange();
			return;
		}

		var page = {
			posts: res.posts,
			pageQueries: {
				prev: res.pages.prev || null,
				next: res.pages.next || null
			}
		};
		var __firstPost = page.posts[0];
		var __lastPost = page.posts[page.posts.length-1];
		page.id = String(__firstPost.received_at || __firstPost.published_at) +":"+ String(__lastPost.received_at || __lastPost.published_at);

		if (operation === "append") {
			pageIds.push(page.id);
			pages.push(page);
		} else { // prepend
			pageIds.unshift(page.id);
			pages.unshift(page);
		}

		this.__setState({
			profiles: profiles,
			pages: pages,
			pageIds: pageIds
		});
	},

	__handleFetchFailure: function (err) {
		Micro.setImmediate(function () {
			if (err instanceof Error) {
				throw err;
			} else {
				var res = err[0];
				var xhr = err[1];
				throw new Error("Failed to fetch posts feed: "+ xhr.status +" - "+ JSON.stringify(res));
			}
		});
	}
});

})();
