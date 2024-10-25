var $app;
(function (_app) {
    (function (_fibTypeIn) {

        var templates = {};
        _fibTypeIn.load = function () {
            var randomizer = {_rnd: Date.now()};
            return $.get("resources/fib-type-in/templates/input.tmpl.html", randomizer)
                .then(function (inputTemplate) {
                    templates.input = inputTemplate;
                    return 0;
                });
        };

        _fibTypeIn.preInit = function (activity) {
            activity.total = _.keys(activity.targets).length;
        };

        _fibTypeIn.render = function (activity) {
            //assert activity.content
            var targetHtml = Mustache.render(activity.content, activity.targets);
            $("#activity .root-html").html('<div class="fib-type-in">' + targetHtml + '</div>');
            $("#activity .root-html").show();
        };

        _fibTypeIn.restore = function (activity) {
            //assert all target ui type is input
            _.each(activity.targets, function (target, id) {
                if (target.ui && target.ui.type === "input") {
                    if (target._answer) {
                        $("#" + target.ui.id).val(target._answer);
                    }
                }
            });
        };

        _fibTypeIn.pause = function (activity) {
        };

        _fibTypeIn.review = function (activity) {
            // _app.helper.legends(['correct', 'incorrect']);
            _fibTypeIn.showOriginal(activity);
        };

        _fibTypeIn.showCorrect = function (activity) {
            $('.fib-type-in').addClass('correct-answers');
            $('.fib-type-in').removeClass('original-answers');
            $('.fib-type-in .expected').show();
            $('.fib-type-in .incorrect').hide();
        };

        _fibTypeIn.showOriginal = function (activity) {
            $('.fib-type-in').removeClass('correct-answers');
            $('.fib-type-in').addClass('original-answers');
            $('.fib-type-in .expected').hide();
            $('.fib-type-in .incorrect').show();
        };

        _fibTypeIn.reset = function (activity) {
            //assert all target ui type is input
            _.each(activity.targets, function (target, id) {
                if (target.ui && target.ui.type === "input") {
                    target._answer = undefined;
                    target._correct = undefined;
                    target.entered = undefined;
                }
            });
        };

        _fibTypeIn.score = function (activity) {
            //assert all target ui type is input
            var correct = 0;
            var missed = 0;
            _.each(activity.targets, function (target, id) {
                if (target.ui && target.ui.type === "input") {
                    target._answer = undefined;
                    target._correct = undefined;
                    target._answer = $("#" + target.ui.id).val();
                    var isCorrectAnswer = _.chain(target.answers)
                        .map(function (answer) {
                            if (activity.caseSensitive) {
                                return answer;
                            }
                            return answer.toLowerCase()
                        })
                        .contains(activity.caseSensitive ? target._answer.trim() : target._answer.toLowerCase().trim())
                        .value();
                    if (target._answer.trim() === "") {
                        target._correct = undefined;
                        missed++;
                    }
                    else if (isCorrectAnswer) {
                        target._correct = true;
                        correct++;
                    }
                    else {
                        target._correct = false;
                    }
                }
            });
            return {correct: correct, missed: missed};
        };

        _fibTypeIn.elementRender = function (elem) {
            elem.ui = {type: 'input', id: "input_" + elem.id};
            if (_app._review) {
                if (elem._correct) {
                    return Mustache.render("<span class='correct'>{{_answer}}</span>", elem);
                }
                else {
                    return Mustache.render("<span class='{{mode}}'>{{_answer}}</span><span class='expected'>{{expected}}</span>", {
                        mode: 'incorrect',
                        _answer: elem._answer ? elem._answer : "Input here...",
                        expected: elem.answers.join(" ; ")
                    });
                }
            }
            else {
                return Mustache.render(templates.input, elem);
            }
        };

        _fibTypeIn.retry = function (activity) {
            _.each(activity.targets, function (target) {
                delete target._answer;
                delete target._correct;
                delete target.entered;
            });
            delete activity.progress;
        };

        _app.register("FIBTypeIn", _fibTypeIn);

    })($app.fibTypeIn || ($app.fibTypeIn = {}));
})($app || ($app = {}));