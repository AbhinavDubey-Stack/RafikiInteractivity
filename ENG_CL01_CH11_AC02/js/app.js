var $app;
(function (_app) {
    _app.view = undefined;

    function defineFormatters() {
        Mustache.Formatters = {
            "uppercase": function (str) {
                return str.toUpperCase();
            },
            "lpad": function (str, num, sep) {
                sep = sep || " ";
                str = "" + str;
                var filler = "";
                while ((filler.length + str.length) < num) {
                    filler += sep
                }
                ;
                return (filler + str).slice(-num);
            },
            "date": function (dt) {
                var lpad = Mustache.Formatters.lpad,
                    day = lpad(dt.getDate(), 2, "0"),
                    month = lpad(dt.getMonth() + 1, 2, "0");
                return day + "/" + month + "/" + dt.getFullYear();
            },
            "span": function (elem) {
                return "<span id='" + elem.id + "'></span>";
            },
            "dropdown": function (elem) {
                return handlers[currentActivity().type].elementRender(elem, currentActivity());
            },
            "input": function (elem) {
                return handlers[currentActivity().type].elementRender(elem);
            },
            "drop": function (elem) {
                return handlers[currentActivity().type].elementRender(elem, currentActivity());
            }
        };
    }

    _app.showPage = function () {
        $("#activity .root-html").html("");
        // $("#activity .draggable").html("");
        // $("#activity .baskets").html("");
        $("#activity .root-html").hide();
        // $("#activity .draggable").hide();
        // $("#activity .baskets").hide();
        $("#activity .root-canvas").hide();
        $("#review_section").hide();
        $("#activity .sortable").hide();
        $("#activity .match-the-following").hide();
        $("#activity .jumbled-words").hide();
        $("#activity .image-map-drag-drop").hide();
        $("#activity .mcq").hide();
        $("#btn_reattempt").hide();
        $("#btn_show_correct").hide();
        $("#btn_show_original").hide();
        _app.view.model.labels = _.extend(_app.view.model._labels.all, _app.view.model._labels[currentActivity().type]);

        var activity = _app.view.model.activities[_app.pageIndex];
        if (_app.view.model.showHelp) {
            $("#help-btn").show();
        }
        else {
            $("#help-btn").hide();
        }
        var instructionTmpl = "<div id='instruction_" + activity.id + "'>{{#description}}<div class='instruction-short-text'>{{{.}}}</div>{{/description}}{{#showMore}}<span class='read-more' onclick='$app.showInstructionBox()'>{{{labels.read_more_link}}}</span>{{/showMore}}</div>";
        var showMore = activity.instruction.text || activity.instruction.audio || activity.instruction.image || activity.instruction.video;

        if (activity.instruction.short || showMore) {
            $("#activity .instruction-short").html(Mustache.render(instructionTmpl, {
                description: activity.instruction.short,
                showMore: showMore,
                labels: _app.view.model.labels
            }));
            $("#activity .instruction-short").show();
        }
        else {
            $("#activity .instruction-short").hide();
        }

        $("#current-page").text(_app.pageIndex + 1);

        //Set background image and background color of activity
        var backgroundImage = activity.background;
        //Set review image for drop the bubble as background image
        if (_app._review && activity.type === "DropTheBubble" && activity.reviewImage) {
            backgroundImage = _app.helper.image(activity, activity.reviewImage);
        }
        $("#activity").css('background-color', activity.bgColor || "unset");
        $("#activity").css('background-image', backgroundImage ? "url('" + backgroundImage + "')" : "unset");

        handlers[activity.type].render(activity);
        if (!_app._review) {
            handlers[activity.type].restore(activity);
            if (activity.audio) {
                var audioTemplate = Mustache.render(_app.view.audio, {src: activity.audio, autoPlay: true});
                $('#activity-audio').html(audioTemplate);
                //$('#activity-audio audio').trigger('play');
            }
            else {
                $('#activity-audio').html('');
            }
        }
        else {
            $("#review_section").show();
            $("#btn_reattempt").show();
            //Hide the action buttons for Drop the bubble activity
            if( activity.type !== "DropTheBubble") {
                $("#btn_show_correct").show();
            }
            $("#legend_section").hide();
            handlers[activity.type].review(activity);
            //$('#activity-audio').html('');

            if (activity.audio) {
                var audioTemplate = Mustache.render(_app.view.audio, {src: activity.audio});
                $('#activity-audio').html(audioTemplate);
                //$('#activity-audio audio').trigger('play');
            }
            else {
                $('#activity-audio').html('');
            }

            if (activity.explanation && activity.explanation.length > 0) {
                $("#explanation-btn").show();
            }
            else {
                $("#explanation-btn").hide();
            }
        }

        if (hasNext()) {
            $("#btn_next").removeClass("pure-button-disabled");
        }
        else {
            $("#btn_next").addClass("pure-button-disabled");
        }
        if (hasPrevious()) {
            $("#btn_prev").removeClass("pure-button-disabled");
        }
        else {
            $("#btn_prev").addClass("pure-button-disabled");
        }
    };

    function hasNext() {
        return _app.pageIndex < _app.view.model.activities.length - 1;
    }

    function hasPrevious() {
        return _app.pageIndex > 0;
    }

    _app.start = function () {
        //defineFormatters();
        this.load()
            .then(function (view) {
                _app.view = view;
                return loadActivityTemplates();
            })
            .then(function () {
                return showHomePage();
            })
            .catch(function (error) {
                console.log("Error occured - " + JSON.stringify(error));
            });
    };

    _app.play = function () {
        var html = Mustache.render(_app.view.template, _app.view.model, _app.view.model.labels);
        $("#app").html(html);
        _app.pageIndex = 0;
        //Check if there is only one page then disable pagination buttons
        if (_app.view.model.activities.length <= 1) {
            // $('#app-pagination').hide();
            $('#app-pagination').css('visibility', 'hidden');
        }
        _app.showPage();
        bindButtons();
        startTimer();
    };

    function loadActivityTemplates() {
        return $.when(_.uniq(_app.view.base.activities, 'type').map(function (activity) {
            return handlers[activity.type].load();
        }));
    }

    function preInit() {
        var promises = _.map(_app.view.model.activities, function (activity) {
            var handler = handlers[activity.type];
            return handler.preInit(activity);
        });
        return Promise.all(promises);
    }

    function showHomePage() {
        _app.view.model = JSON.parse(JSON.stringify(_app.view.base));
        shuffle();
        var html = Mustache.render(_app.view.startTemplate, _app.view.model, _app.view.model.labels);
        $("#app").html(html);
        $("#loader").hide();
        $("#btn_play").html(_app.view.model.labels.loading_button);
        $("#btn_play").attr("disabled", "disabled");
        return preInit()
            .then(function () {
                $("#btn_play").html("Play");
                if (_app.view.model.activities.length >= 1) {
                    $("#btn_play").removeAttr("disabled");
                    $("#btn_play").click(function () {
                        _app.play();
                    });
                }
            });
    }

    function startTimer() {
        if (_app.view.model.timer.total === null || _app.view.model.timer.total === 0) {
            $("#timer-holder").hide();
            return;
        }
        $("#timer").timer({
            countdown: true,
            duration: _app.view.model.timer.total + 'm',
            callback: function () {
                submit(true);
            },
            format: '%M:%S'
        });
    }

    function bindButtons() {
        $("#btn_next").click(next);
        $("#btn_prev").click(prev);
        $("#btn_submit").click(submit);
        $("#btn_reset").click(pageReset);
        $("#btn_reattempt").click(_app.retry);
        $("#btn_show_original").click(_app.showOriginal);
        $("#btn_show_correct").click(_app.showCorrect);
    }

    function submit(force) {
        if (force === true) {
            $("#timer").timer('remove');
        }
        //Check if activity has a P5 canvas, if it has then pause it; to prevent click while clicking on dialog box

        var activity = currentActivity();
        if (activity._p5Instance) {
            activity._paused = true;
            activity._p5Instance.noLoop();
        }
        pageScore();
        //show the score
        var total = _.reduce(_app.view.model.activities, function (memo, activity) {
            return memo + (activity.total ? activity.total : 0);
        }, 0);

        var correct = _.reduce(_app.view.model.activities, function (memo, activity) {
            return activity.progress ? memo + activity.progress.correct : memo;
        }, 0);

        var missed = _.reduce(_app.view.model.activities, function (memo, activity) {
            if (activity.progress) {
                return memo + activity.progress.missed;
            }
            if (activity.total) {
                return memo + activity.total;
            }
            return memo;
        }, 0);
        _app.progress = {total: total, correct: correct, missed: missed};


        if (force === true || _app.progress.missed === 0) {
            showScore();
        }
        else {
            showFeedback();
        }
    }

    function showFeedback() {
        var incompleteBoxHtml = Mustache.render(_app.view.incompleteBox);
        $("#incomplete-box").html(incompleteBoxHtml);
        showPopup("incomplete-box");
    }

    function showScore() {
        //hide the submit button
        $("#btn_submit").hide();
        $("#timer").timer('remove');
        var scoreHtml = Mustache.render(_app.view.model.labels.score_popup, _app.progress);
        var scoreBoxHtml = Mustache.render(_app.view.scoreBox, {scoreHtml: scoreHtml, labels: _app.view.model.labels});
        $("#score-box").html(scoreBoxHtml);
        showPopup('score-box');
    }

    function prev() {
        if (!_app._review) {
            pageScore();
        }
        if (hasPrevious()) {
            //Pause activity
            var activity = currentActivity();
            handlers[activity.type].pause(activity);
            _app.pageIndex--;
            _app.showPage();
        }
    }

    function next() {
        if (!_app._review) {
            pageScore();
        }
        if (hasNext()) {
            //Pause activity
            var activity = currentActivity();
            handlers[activity.type].pause(activity);
            _app.pageIndex++;
            _app.showPage();
        }
    }

    function currentActivity() {
        return _app.view.model.activities[_app.pageIndex];
    }

    function pageScore() {
        var activity = currentActivity();
        var correct = 0;
        var missed = 0;
        var total = 0;
        var score = handlers[activity.type].score(activity);
        correct = correct + score.correct;
        missed = missed + score.missed;
        total = total + activity.total;
        console.log("Total - " + total + ", Correct - " + correct + ", Missed - " + missed);
        if (!activity.progress) {
            activity.progress = {};
        }
        activity.progress.total = total;
        activity.progress.correct = correct;
        activity.progress.missed = missed;
    }

    function pageReset() {
        var activity = currentActivity();
        handlers[currentActivity().type].reset(activity);
        activity.progress = undefined;
        _app.showPage();
    }

    function showPopup(popupId) {
        $("#" + popupId).addClass("show");
    }

    function closePopup(popupId) {
        $("#" + popupId).removeClass("show");
    }

    _app.review = function () {
        //close the score-box
        closePopup("score-box");
        $("#btn_reattempt").show();
        $("#btn_show_correct").show();

        _app._review = true;
        //hide the timer

        // $("#timer-holder").hide();

        //hide the reset
        $("#reset_section").hide();

        //show the explanation icon

        //show the score
        //var total = _.reduce(_app.view.model.activities, function(memo, activity){
        //
        //    if (activity.targets){
        //        return memo + _.keys(activity.targets).length;
        //    }
        //    if (activity.sources){
        //        return memo + activity.sources.length;
        //    }
        //    return memo;
        //},0);
        //
        //var obtained = _.reduce(_app.view.model.activities, function(memo, activity){
        //    return activity.progress ? memo + activity.progress.correct : memo;
        //},0);
        //Whether to show or hide score
        if (_app.view.model.showScore) {
            $("#your_score").html(Mustache.render(_app.view.model.labels.your_score, _app.progress));
        }

        //show reviews from page 1

        //start from page 1
        _app.pageIndex = 0;
        _app.showPage();
    };

    _app.retry = function () {
        showHomePage();
        $("#btn_reattempt").hide();
        $("#btn_show_correct").hide();
        $("#btn_show_original").hide();
        _app._review = false;
        //hide score
        // $("#your_score").html('');
        // //show timer
        // $("#timer-holder").show();

        //close the score-box
        closePopup("score-box");

        //Shuffle activities
        shuffle();

        // //reset the answers
        // _.each(_app.view.model.activities, function (activity) {
        //     handlers[activity.type].retry(activity);
        // });
        // //start from page 1
        // _app.pageIndex = 0;
        // $("#btn_reattempt").hide();
        // $("#btn_submit").show();
        // startTimer();
        // _app.showPage();
    };

    _app.showCorrect = function () {
        console.log("In Show Correct");
        $('#btn_show_correct').hide();
        $('#btn_show_original').show();
        handlers[currentActivity().type].showCorrect(currentActivity());
    };

    _app.showOriginal = function () {
        console.log("In Show Original");
        $('#btn_show_original').hide();
        $('#btn_show_correct').show();
        handlers[currentActivity().type].showOriginal(currentActivity());
    };

    _app.incompleteOK = function () {
        closePopup("incomplete-box");
        showScore();
    };

    _app.incompleteNOK = function () {
        closePopup("incomplete-box");
        //Check if activity has a P5 canvas, if it has then play it; which we have paused while submiting activity
        var activity = currentActivity();
        if (activity._p5Instance) {
            activity._paused = false;
            activity._p5Instance.loop();
        }
    };

    _app.load = function () {
        var view = {template: "", base: {}, model: {}, sub_templates: {}};
        //load the template
        //load the labels model
        //load the activity model
        //make master model - activity model + labels model + functions
        var randomizer = {_rnd: Date.now()};
        var templatesLoader = $.when(
            $.get("templates/start.tmpl.html", randomizer),
            $.get("templates/app.tmpl.html", randomizer),
            $.get("templates/failure-overlay.tmpl.html", randomizer),
            $.get("templates/legend.tmpl.html", randomizer),
            $.get("templates/help.tmpl.html", randomizer),
            $.get("templates/instruction.tmpl.html", randomizer),
            $.get("templates/miniature-image.tmpl.html", randomizer),
            $.get("templates/activity-audio.tmpl.html", randomizer),
            $.get("templates/score-box.tmpl.html", randomizer),
            $.get("templates/incomplete-box.tmpl.html", randomizer),
            $.get("templates/explanation-box.tmpl.html", randomizer)
        )
            .then(function (startTemplate, appTemplate, failureOverlayTemplate, legendTemplate, helpTemplate, instructionTemplate, miniatureTemplate, audioTemplate, scoreBox, incompleteBox, explanationBox) {
                view.startTemplate = startTemplate[0];
                view.template = appTemplate[0];
                view.failureOverlay = failureOverlayTemplate[0];
                view.legend = legendTemplate[0];
                view.help = helpTemplate[0];
                view.instruction = instructionTemplate[0];
                view.miniature = miniatureTemplate[0];
                view.audio = audioTemplate[0];
                view.scoreBox = scoreBox[0];
                view.incompleteBox = incompleteBox[0];
                view.explanationBox = explanationBox[0];
                return 0;
            });

        var urlVars = getUrlVars();
        var modelLoader = $.when(
            $.get(urlVars.json ? urlVars.json : "model/app.json", randomizer),
            $.get("model/labels.json", randomizer),
            $.get("model/help.json", randomizer)
        )
            .then(function (appModel, labels, help) {
                $.extend(true, view.base, appModel[0]);
                view.base._labels = labels[0];
                view.base.labels = labels[0].all;
                view.base.help = help[0];
                return 0;
            });
        if (urlVars.json) {
            _app.dataDir = urlVars.json.split("/")[0];
        }

        return $.when(templatesLoader, modelLoader)
            .then(function () {
                return view;
            })
            .catch(function (error) {
                throw {url: this.url, method: this.type, status: error.status, statusText: error.statusText};
            });
    };

    _app.reloadActivity = function (activity) {
        var failureOverlayHtml = Mustache.render(_app.view.failureOverlay, {
            'message': "Failed to load", "btnLabel": "Reload",
        });
        var overlay = $("#overlay");
        overlay.html(failureOverlayHtml);
        $("#reload-button").click(function () {
            $("#overlay").hide();
            pageReset();
        });
        overlay.show();
    };

    _app.showExplanation = function () {

        var explanationBoxHtml = Mustache.render(_app.view.explanationBox, currentActivity().explanation);
        $("#explanation-box").html(explanationBoxHtml);
        showPopup('explanation-box');
        setModalMaxHeigth($("#explanation-box"));
    };

    _app.hideExplanationBox = function () {
        closePopup('explanation-box');
    };

    _app.showInstructionBox = function () {
        var instructionHtml = Mustache.render(_app.view.instruction, currentActivity().instruction);
        $("#instruction-box").html(instructionHtml);
        showPopup('instruction-box');
        setModalMaxHeigth($("#instruction-box"));
    };

    _app.hideInstructionBox = function () {
        $("#instruction-box").html("");
        closePopup('instruction-box');
    };

    _app.showHelpBox = function () {
        var activityHelp = _app.view.model.help[currentActivity().type];
        var helpHtml = Mustache.render(_app.view.help, activityHelp);
        $("#help-box").html(helpHtml);
        showPopup('help-box');
        setModalMaxHeigth($("#help-box"));
    };

    _app.hideHelpBox = function () {
        $("#help-box").html('');
        closePopup('help-box');
    };

    _app.showMiniatureBox = function () {
        var miniatureHtml = Mustache.render(_app.view.miniature, currentActivity());
        $("#miniature-box").html(miniatureHtml);
        showPopup('miniature-box');
        setModalMaxHeigth($("#miniature-box"));
    };

    _app.hideMiniatureBox = function () {
        $("#miniature-box").html('');
        closePopup('miniature-box');
    };

    function setModalMaxHeigth(modal) {
        var maxHeight = window.screen.height - $(modal).find('.header').height() - $(modal).find('.footer').height() - 200;
        $(modal).find('.overflow-x').css('max-height', maxHeight);
    }

    function shuffle() {
        if (_app.view.model.shuffle) {
            _app.view.model.activities = _.shuffle(_app.view.model.activities);
        }
    }

    function getUrlVars() {
        var vars = [], hash;
        var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
        for (var i = 0; i < hashes.length; i++) {
            hash = hashes[i].split('=');
            vars.push(hash[0]);
            vars[hash[0]] = hash[1];
        }
        return vars;
    }

    function globalHooks() {
        $(document).on("focusout", ".paragraph input", function () {
            var element = $(this);
            var trimmed = element.val().trim().replace(/\s+/g, " ");
            element.val(trimmed);
        });
    }

    var handlers = {};
    _app.register = function (type, handler) {
        handlers[type] = handler;
    };

    defineFormatters();
    globalHooks();
})($app || ($app = {}));