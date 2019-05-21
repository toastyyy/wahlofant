/**
 * This app provides a quiz consisting of political questions and answers from parties containing justifications for their
 * attitude in the respective question. Finally, this app calculates a matching score of the user to the
 * parties (procentual).
 *
 * @author Christoph Schreiber
 * @version alpha0.1
 */

var app = angular.module('wahlofantApp', []);
var CURRENT_SOURCE = 'europa';

app.controller('PollController', function($http, $scope) {
    $scope.state = "loading"; // current state of the application, either "loading", "loaded" or "error".
    $scope.topics = []; // topics of questions. Will be automatically populated if question have been loaded.
    $scope.currentQuestion = -1; // current question index. -1 represents topic selection which is the first step.
    $scope.questionAttitude = {}; // collects all attitudes of the user.
    $scope.questionResults = []; // collects all user inputs for party thesis.
    $scope.currentAttitude = ""; // attitude to the current question, can be "yes" or "no"
    $scope.parties = []; // List of all parties
    $scope.questions = []; // List of all questions with answers

    /* indicates step inside a question. first step is always "attitude" (where to user select to be or be not ACK
    with a question). Second step is always justification where the user selects justifications from parties. */
    $scope.questionMode = "attitude";

    /* Contains all questions that are in the specified topics. */
    $scope.questionList = [];

    /* Load questions when questions.js has been loaded. */
    var questionLoadInterval = null;
    var checkQuestionsLoaded = function() {
        if(typeof categories != 'undefined' && typeof comments != 'undefined' && typeof opinions != 'undefined'
            && typeof overview != 'undefined' && typeof parties != 'undefined' && typeof statements != 'undefined') {

            var getCategory = function(id) { for(var i = 0; i < categories.length; i++) { if(categories[i].id == id) return categories[i]; } return null; };
            var getParty = function(id) { for(var i = 0; i < parties.length; i++) { if(parties[i].id == id) return parties[i]; } return null; };
            var getStatement = function(id) { for(var i = 0; i < statements.length; i++) { if(statements[i].id == id) return statements[i]; } return null; };
            var getOpinion = function(id) { for(var i = 0; i < opinions.length; i++) { if(opinions[i].id == id) return opinions[i]; } return null; };
            var getComment = function(id) { for(var i = 0; i < comments.length; i++) { if(comments[i].id == id) return comments[i]; } return null; };


            var getAnswers = function(statementId) {
                var answers = [];
                for(var i = 0; i < opinions.length; i++) {
                    if(opinions[i].statement == statementId && opinions[i].answer < 2) {
                        var reasonText = getComment(opinions[i].comment).text;
                        if(reasonText != 'Zu dieser These hat die Partei keine Begründung vorgelegt.') {
                            answers.push({
                                id : opinions[i].id,
                                party : getParty(opinions[i].party).name,
                                result : opinions[i].answer == 0 ? 'yes' : 'no',
                                reason : getComment(opinions[i].comment).text
                            });
                        }
                    }
                }
                return answers;
            };
            $scope.parties = parties;

            for(var i = 0; i < statements.length; i++) {
                var cat = getCategory(statements[i].category);
                var currentQuestion = {
                    "id" : statements[i].id,
                    "category" : (cat != null) ? cat.label : 'Unbekannt',
                    "thesis" : statements[i].text,
                    "title" : statements[i].label,
                    "answers" : getAnswers(statements[i].id)
                };
                $scope.questions.push(currentQuestion);
            }
            $scope.topics = $scope.getTopics(); // populate topics
            $scope.state = "loaded"; // app is ready for the user
            $scope.$digest(); // call digest circle as we are in interval so angular does not notice the changes we made
            clearInterval(questionLoadInterval);
        }
    };
    /* Check every second for questions.js to be loaded */
    questionLoadInterval = window.setInterval(checkQuestionsLoaded, 1000);

    /* Get the list of different topics in all questions and the number of questions in it */
    $scope.getTopics = function() {
        var topicList = [];
        for(var i in $scope.questions) {
            var inList = false;
            for(var j in topicList) {
                if(topicList[j].name == $scope.questions[i].category) {
                    topicList[j].numberOfQuestions++;
                    inList = true;
                }
            }
            if(!inList) {
                topicList.push({ name: $scope.questions[i].category, numberOfQuestions: 1, selected: false });
            }
        }
        return topicList;
    };

    /* Check wether a topic has been selected or not. */
    $scope.isTopicSelected = function(topicName) {
        for(var i in $scope.topics) {
            if ($scope.topics[i].name == topicName) {
                return $scope.topics[i].selected;
            }
        }
    };

    /* Toggles topic selection. */
    $scope.toggleTopic = function(topicName) {
        for(var i in $scope.topics) {
            if($scope.topics[i].name == topicName) {
                $scope.topics[i].selected = !$scope.topics[i].selected;
                break;
            }
        }
    };

    /* Get a list of all selected topics. */
    $scope.selectedTopics = function() {
        var topics = [];
        for(var i in $scope.topics) {
            if($scope.topics[i].selected) {
                topics.push($scope.topics[i]);
            }
        }
        return topics;
    };

    /* Calculate the expected duration of quiz by the total number of questions. */
    $scope.calculateMinutes = function() {
        var topics = $scope.selectedTopics();
        var numQuestions = 0;
        for(var i in topics) {
            numQuestions += topics[i].numberOfQuestions;
        }

        return Math.ceil(numQuestions * 0.65);
    };

    /* Calculate the question list by the users selected topics. */
    $scope.calculateQuestionList = function() {
        var topics = $scope.selectedTopics();
        var questions = [];
        for(var i in topics) {
            for(var j in $scope.questions) {
                if($scope.questions[j].category == topics[i].name) {
                    questions.push($scope.questions[j]);
                }
            }
        }
        $scope.questionList = questions;

        /* workaround: set timeout so that animation for "question sliding" works. */
        window.setTimeout(function() {
            $scope.currentQuestion += 1;
            $scope.$digest();
        }, 300);

    };

    /* Go to the next question in list. */
    $scope.nextQuestion = function() {
        $scope.questionMode = "attitude";
        $scope.currentAttitude = "";
        if($scope.currentQuestion + 1 == $scope.questionList.length) {
            $scope.scores = getScores();
        }
        $scope.currentQuestion += 1;
    };

    /* Go to the last question in list. */
    $scope.lastQuestion = function() {
        $scope.questionMode = "attitude";
        $scope.currentQuestion -= 1;
    };

    /* User is ACK with a question. */
    $scope.pro = function(question) {
        $scope.currentAttitude = "yes";
        $scope.questionAttitude[""+question.id] = "yes";
        unselectByQuestionAndResult(question.id, "no");
        unselectByQuestionAndResult(question.id, "other");
        $scope.questionMode = "justification";
    };

    /* User is not ACK with a question. */
    $scope.con = function(question) {
        $scope.currentAttitude = "no";
        $scope.questionAttitude[""+question.id] = "no";
        unselectByQuestionAndResult(question.id, "yes");
        unselectByQuestionAndResult(question.id, "other");
        $scope.questionMode = "justification";
    };

    /* User does not care about a question. */
    $scope.nvm = function(question) {
        $scope.questionAttitude[""+question.id] = "nvm";
        unselectByQuestionAndResult(question.id, "yes");
        unselectByQuestionAndResult(question.id, "no");
        $scope.nextQuestion();
    };

    /* Filter party justifications by users attitude to the current question. */
    $scope.filterResult = function(item) {
        return ((item.result == $scope.currentAttitude || item.result == 'neutral') && item.reason != "")
    };

    /* Toggle the selection of a parties justification. */
    $scope.toggleAnswer = function(answer) {
        for(var i in $scope.questionResults) {
            if($scope.questionResults[i].id == answer.id) {
                $scope.questionResults.splice(i, 1);
                return;
            }
        }
        $scope.questionResults.push(answer);
    };

    /* Checks wether a party justification has been selected or not. */
    $scope.isAnswerActive = function(answer) {
        for(var i in $scope.questionResults) {
            if($scope.questionResults[i].id == answer.id) {
                return true;
            }
        }
        return false;
    };

    $scope.scores = [];
	

    function getScores() {
		/* 
		 * Calculate scores by the following rules:
		 * - if the users attitude is equal to the partys answer and the user selected the partys justification, add 5 points.
		 * - if the users attitude is equal to the partys answer and the user DID NOT select the partys justification, add 2 points.
		 * - if the users attitude is not equal to the partys answer, remove 3 points.
		 */
        var scores = {};

        function addScore(party, question, score) {
            if(Object.keys(scores).indexOf(party) != -1) {
                scores[party].scores.push({questionId: question.id, score: score});
            } else {
                scores[party] = {
                    scores: [{questionId: question.id, score: score}],
                    party: party
                };
            }
        }

        for(var i in $scope.questionList) {
            for(var p in $scope.parties) {
                var isAttitudeEqual = $scope.getPartyAttitude($scope.questionList[i], $scope.parties[p]) == $scope.getAttitude($scope.questionList[i]);
                if(isAttitudeEqual) {
                    var partiesAnswerSelected = false;
                    for(var j in $scope.questionList[i].answers) {
                        if ($scope.isAnswerActive($scope.questionList[i].answers[j]) && $scope.questionList[i].answers[j].party == $scope.parties[p]) {
                            partiesAnswerSelected = true;
                            break;
                        }
                    }
                    if(partiesAnswerSelected) {
                        addScore($scope.parties[p], $scope.questionList[i], 5);
                    } else {
                        addScore($scope.parties[p], $scope.questionList[i], 2);
                    }
                } else {
                    addScore($scope.parties[p], $scope.questionList[i], -3);
                }
            }
        }
        return scores;
    };

    $scope.orderTotalScore = function(partyName) {
        return $scope.getTotalScore($scope.scores[partyName])
    };

    function unselectByQuestionAndResult(questionId, result) {
        var removedEntry = true;
        while(removedEntry) {
            for(var i in $scope.questionResults) {
                if($scope.questionResults[i].questionId == questionId && $scope.questionResults[i].result == result) {
                    $scope.questionResults.splice(i, 1);
                    break;
                }
            }
            removedEntry = false;
        }
    }

    $scope.selectedAnswersForQuestion = function(questionId) {
        var results = [];
        for(var i in $scope.questionResults) {
            if($scope.questionResults[i].questionId == questionId) {
                results.push($scope.questionResults[i]);
            }
        }
        return results;
    };
	
	$scope.getPartyImage = function(name) {
		return partyImageMap[name];
	};

	function isAttitudeDistinct(results) {
	    if(results.length > 0) {
            var currentAttitude = results[0].result;
            for(var i in results) {
                if(results[i].result != currentAttitude) {
                    return false;
                }
            }
        }
        return true;
    }

	$scope.getAttitude = function(question) {
	    if(Object.keys($scope.questionAttitude).indexOf(""+question.id) >= 0) {
	        return $scope.questionAttitude[question.id];
        } else {
	        return "noopinion";
        }
    };

    $scope.getPartyAttitude = function(question, party) {
        for(var i in $scope.questionList) {
            if($scope.questionList[i].id == question.id) {
                for(var j in $scope.questionList[i].answers) {
                    if($scope.questionList[i].answers[j].party == party) {
                        return $scope.questionList[i].answers[j].result;
                    }
                }
            }
        }
        return "noopinion";
    };

    $scope.getScoreForQuestion = function(question, scoreObj) {
        for(var i in scoreObj.scores) {
            if(scoreObj.scores[i].questionId == question.id) {
                return scoreObj.scores[i].score;
            }
        }
        return 0;
    };

    $scope.getTotalScore = function(scoreObj) {
        var total = 0;
        for(var i in scoreObj.scores) {
            total += scoreObj.scores[i].score;
        }
        return total;
    }
});
