var $app;
(function (_app) {
    (function (_helper) {
        _helper.parseId = function (str) {
            var tokens = str.split("_");
            if (tokens.length === 2) {
                if (!isNaN(parseInt(tokens[1]))) {
                    return parseInt(tokens[1]);
                }
                else {
                    return tokens[1];
                }
            }
            return str;
        };

        _helper.image = function (activity, imagePath) {
            return _app.dataDir ? activity.uri + "/image/" + imagePath : activity.uri + '/' + imagePath;
        };

        _helper.preloadImages = function (images) {
            var dfd = $.Deferred();
            if (images.length > 0) {
                $.imgpreload(images,
                    {
                        all: function () {
                            // callback invoked when all images have loaded
                            // this = array of dom image objects
                            // check for success with: $(this[i]).data('loaded')
                            dfd.resolve();
                        }
                    });
                return dfd;
            }
            else {
                return dfd.resolve();
            }
        };

        _helper.legends = function (_legends) {
            var legendSection = $("#legend_section");
            $("#legend_section .legends").remove();
            var staticLegends = {
                'correct': {color: 'greenyellow', value: _app.view.model.labels.correct_answer, image: 'correct.png'},
                'expected': {color: 'yellow', value: _app.view.model.labels.expected_answer, image: 'expected.png'},
                'missed': {color: 'orange', value: _app.view.model.labels.missed_answer, image: 'missed.png'},
                'incorrect': {color: 'red', value: _app.view.model.labels.incorrect_answer, image: 'incorrect.png'}
            };
            if (!_legends) {
                _legends = ['correct', 'incorrect', 'missed', 'expected'];
            }

            var legends = _.map(_legends, function (name) {
                return staticLegends[name];
            });

            var legendsHtml = Mustache.render(_app.view.legend, legends);
            legendSection.append(legendsHtml);
            legendSection.show();
        }

    })($app.helper || ($app.helper = {}));
})($app || ($app = {}));