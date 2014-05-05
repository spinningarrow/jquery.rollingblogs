// jquery.rollingblogs v0.3
//
// Copyright 2013 Sahil Bajaj
// Released under the MIT license

(function ($, google) {

	// Load Google Feed API
	google.load("feeds", "1")

	// Fetches the feeds (each with one entry) using the Google Feed API
	// @param {Array} feeds URLs of feeds to be loaded
	// @return {Array} Deferreds corresponding to the fetched feeds
	function fetchFeeds(feeds) {
		var deferreds = []

		$(feeds).each(function (index, feedUrl) {
			deferreds[index] = $.Deferred()

			var feed = new google.feeds.Feed(feedUrl)
			feed.setResultFormat(google.feeds.Feed.JSON_FORMAT)
			feed.setNumEntries(1)

			feed.load(function (result) {
				// Augment the object to make the last published date
				// easily accessible
				result.feed.lastPublished = new Date(result.feed.entries[0].publishedDate)
				deferreds[index].resolve(result.feed)
			})
		})

		// Return promises of the deferred objects
		return $.map(deferreds, function (deferred) {
			return deferred.promise()
		})
	}

	// Sorts feeds according to the last published date
	// @param {Array} feedsDeferreds Feeds to be sorted
	// @param {jQuery Object} $element DOM element in which to display sorted feeds
	// @return {Promise} Array of sorted feeds
	function sortFeeds(feedsDeferreds) {
		var deferred = $.Deferred()

		// Wait for all feeds to finish loading
		$.when.apply($, feedsDeferreds).done(function () {
			// Sort feeds by last published date
			var sortedFeeds = $.makeArray(arguments).sort(function (a, b) {
				return new Date(b.lastPublished).getTime() - new Date(a.lastPublished).getTime()
			})

			deferred.resolve(sortedFeeds)
		})

		return deferred.promise()
	}

	// jQuery plugin hook
	// @param {Object} options Options passed to the plugin (e.g. template)
	$.fn.rollingblogs = function (options) {
		return this.each(function () {
			var $element = $(this)
			options = typeof options === 'object' ? options : {}

			options.template = typeof options.template === 'function' ?
				options.template :
				function (value) {
					return '' +
						'<li><a href="' + value.link +
						'" title="' + value.author +
						'" data-feed="' + value.feedUrl +
						'">' + (value.title || value.link) +
						'</a> <time datetime="' + value.lastPublished +
						'">' + value.lastPublished +
						'</time></li>'
				}

			// Get Feed URLs from data attributes in the list of links
			var feeds = $.map($element.find('[data-feed]'), function (item) {
				return $(item).data('feed')
			})

			// Sort feeds after Google Feed API has loaded
			google.setOnLoadCallback(function () {
				sortFeeds(fetchFeeds(feeds)).done(function (sortedFeeds) {
					var htmlResult = []

					// Format HTML results using the template specified by
					// options
					$(sortedFeeds).each(function () {
						htmlResult.push(options.template(this))
					})

					$element.html(htmlResult.join(''))
				})
			})
		})
	}
})(jQuery, google);
