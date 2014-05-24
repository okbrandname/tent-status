/** @jsx React.DOM */

(function () {
"use strict";

Micro.Views.ScrollPagination = React.createClass({
	displayName: "Micro.Views.ScrollPagination",

	getDefaultProps: function () {
		return {
			pageIds: [],
			loadPrevPage: function () {},
			loadNextPage: function () {}
		};
	},

	componentWillMount: function () {
		this.__paddingTop = 0;
		this.__offsetHeight = 0;
		this.__offsetTop = 0;
		this.__offsetBottom = 0;

		this.__renderedPageIds = [];
		this.__unloadedPageHeights = {};
		this.__pageHeights = {};
	},

	componentDidMount: function () {
		this.__updateDimensions();
		this.__evaluatePagesMutation();
		window.addEventListener("scroll", this.__handleScroll, false);
		window.addEventListener("resize", this.__handleResize, false);
	},

	componentWillUpdate: function (props) {
		this.__loadingPrevPage = false;
		this.__loadingNextPage = false;
		this.__unloadingPage = false;

		// save scroll position
		this.__scrollY = window.scrollY;

		this.__determinePagesDelta(props.pageIds);
	},

	componentDidUpdate: function () {
		this.__updateDimensions();

		// restore scroll position
		window.scrollTo(0, this.__scrollY);
		delete this.__scrollY;

		this.__evaluatePagesMutation();
	},

	componentWillUnmount: function () {
		window.removeEventListener("scroll", this.__handleScroll, false);
		window.removeEventListener("resize", this.__handleResize, false);
	},

	render: function () {
		var style = {};
		if (this.__paddingTop) {
			style.paddingTop = this.__paddingTop + "px";
		}
		return (
			<div ref="wrapper" style={style}>
				{this.props.children}
			</div>
		);
	},

	__unloadPage: function (pageId) {
		if (this.__unloadingPage) {
			return;
		}
		this.__unloadingPage = true;
		this.props.unloadPage(pageId);
	},

	__loadPrevPage: function () {
		if (this.__loadingPrevPage) {
			return;
		}
		this.__loadingPrevPage = true;
		this.props.loadPrevPage();
	},

	__loadNextPage: function () {
		if (this.__loadingNextPage) {
			return;
		}
		this.__loadingNextPage = true;
		this.props.loadNextPage();
	},

	__determinePagesDelta: function (pageIds) {
		var renderedPageIds = this.__renderedPageIds;

		// find new page id (if any)
		// must be either at beginning or end of list
		var newPageId = null;
		var newPagePosition = null;
		var unloadedPageId = null;
		var unloadedPagePosition = null;
		var firstPageId = pageIds[0];
		var lastPageId = pageIds[pageIds.length-1];
		if (renderedPageIds.indexOf(lastPageId) === -1) {
			newPageId = lastPageId;
			newPagePosition = "bottom";
		} else if (renderedPageIds.indexOf(firstPageId) === -1) {
			newPageId = firstPageId;
			newPagePosition = "top";
		} else if (pageIds.length > renderedPageIds.length) {
			throw new Error("ScrollPagination: New pages must be inserted at beginning or end!\nold("+ renderedPageIds.join(", ") +")\nnew("+ pageIds.join(", ") +")");
		} else {
			// find removed page id
			// must be either at beginning or end of list
			var firstRenderedPageId = renderedPageIds[0];
			var lastRenderedPageId = renderedPageIds[renderedPageIds.length-1];
			if (firstRenderedPageId !== firstPageId) {
				unloadedPageId = renderedPageIds[0];
				unloadedPagePosition = "top";
			} else if (lastRenderedPageId !== lastPageId) {
				unloadedPageId = lastRenderedPageId;
				unloadedPagePosition = "bottom";
			}
		}

		var pageNumDelta = pageIds.length - renderedPageIds.length;
		if (newPageId && pageNumDelta !== 1 || unloadedPageId && pageNumDelta !== -1) {
			throw new Error("ScrollPagination: May only add or remove a single page but there is a difference of "+ pageNumDelta +"!");
		}

		renderedPageIds = [].concat(pageIds);
		this.__renderedPageIds = renderedPageIds;

		this.__newPageId = newPageId;
		this.__newPagePosition = newPagePosition;
		this.__unloadedPageId = unloadedPageId;
		this.__unloadedPagePosition = unloadedPagePosition;
	},

	__updateDimensions: function () {
		var unloadedPageHeights = this.__unloadedPageHeights;
		var pageHeights = this.__pageHeights;

		var newPageId = this.__newPageId;
		var newPagePosition = this.__newPagePosition;
		delete this.__newPagePosition;
		delete this.__newPageId;

		var unloadedPageId = this.__unloadedPageId;
		var unloadedPagePosition = this.__unloadedPagePosition;
		delete this.__unloadedPageId;
		delete this.__unloadedPagePosition;

		if (unloadedPageId) {
			delete pageHeights[unloadedPageId];
		}

		var el = this.refs.wrapper.getDOMNode();

		var oldOffsetHeight = this.__offsetHeight;
		var newOffsetHeight = el.offsetHeight;
		var offsetHeightDelta = newOffsetHeight - oldOffsetHeight;
		var oldPageHeight;
		var pageHeightDelta = 0;

		if (newPageId) {
			if (newPagePosition === "top") {
				var oldPaddingTop = this.__paddingTop;
				oldPageHeight = unloadedPageHeights[newPageId];
				delete unloadedPageHeights[newPageId];
				if (oldPageHeight && oldPageHeight !== offsetHeightDelta) {
					pageHeightDelta = oldPageHeight - offsetHeightDelta;
				}
				this.__paddingTop = Math.max(this.__paddingTop - offsetHeightDelta - pageHeightDelta, 0);
				this.refs.wrapper.getDOMNode().style.paddingTop = this.__paddingTop +"px";
			} else { // bottom
			}

			pageHeights[newPageId] = offsetHeightDelta;
		} else {
			if (unloadedPagePosition === "top") {
				oldPaddingTop = this.__paddingTop;
				this.__paddingTop = this.__paddingTop + (offsetHeightDelta * -1); // negative delta
				unloadedPageHeights[unloadedPageId] = offsetHeightDelta * -1;
				this.refs.wrapper.getDOMNode().style.paddingTop = this.__paddingTop +"px";
			}
		}

		newOffsetHeight = el.offsetHeight;
		this.__offsetHeight = newOffsetHeight;

		var offsetTop = 0;
		var ref = el;
		while (ref) {
			offsetTop += ref.offsetTop || 0;
			ref = ref.offsetParent;
		}
		this.__offsetTop = offsetTop;

		this.__viewportHeight = window.innerHeight;
	},

	__evaluatePagesMutation: function (e) {
		if (this.__offsetHeight === 0) {
			return;
		}
		if (this.__loadingNextPage || this.__loadingPrevPage || this.__unloadingPage) {
			if (e) {
				e.preventDefault();
			}
			return;
		}

		var scrollY = window.scrollY;
		var viewportHeight = this.__viewportHeight;
		var paddingTop = this.__paddingTop;
		var remainingScrollBottom = this.__offsetHeight + this.__offsetBottom - scrollY - viewportHeight;
		var pagesOffsetTop = this.__offsetTop + paddingTop;
		var remainingScrollTop = scrollY - pagesOffsetTop;

		var pageIds = this.props.pageIds;
		var pageHeights = this.__pageHeights;
		var firstPageId = pageIds[0];
		var firstPageHeight = pageHeights[firstPageId];
		var lastPageId = pageIds[pageIds.length-1];
		var lastPageHeight = pageHeights[lastPageId];

		if ( !lastPageHeight || remainingScrollBottom <= (lastPageHeight / 3)) {
			if (firstPageHeight && (scrollY - pagesOffsetTop - firstPageHeight) > viewportHeight) {
				this.__unloadPage(firstPageId);
			} else {
				this.__loadNextPage();
			}
		} else if (paddingTop > 1 && remainingScrollTop <= (firstPageHeight / 3)) {
			if (pageIds.length > 1 && (this.__offsetHeight - scrollY - viewportHeight) > lastPageHeight) {
				this.__unloadPage(lastPageId);
			} else {
				this.__loadPrevPage();
			}
		}
	},

	__handleScroll: function (e) {
		this.__evaluatePagesMutation(e);
	},

	__handleResize: function () {
		this.__updateDimensions();
		this.__evaluatePagesMutation();
	}
});

})();