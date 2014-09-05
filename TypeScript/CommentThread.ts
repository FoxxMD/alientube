/// <reference path="index.ts" />
/**
    Namespace for All AlienTube operations.
    @namespace AlienTube
*/
module AlienTube {
    /**
        Creates a new instance of a Comment Thread and adds it to DOM.
        @class CommentThread
        @param threadData JavaScript object containing all information about the Reddit thread.
    */
    export class CommentThread {
        commentSection : CommentSection;
        threadInformation : any;

        private postIsInPreservedMode : Boolean;
        private commentData : Array<any>;
        private children : Array<any>;

        constructor(threadData : any, commentSection : CommentSection) {
            this.children = new Array();
            this.commentSection = commentSection;
            this.threadInformation = threadData[0].data.children[0].data;
            this.commentData = threadData[1].data.children;

            var previousUserIdentifier = Main.Preferences.get("redditUserIdentifierHash");
            Main.Preferences.set("redditUserIdentifierHash", threadData[0].data.modhash);
            this.postIsInPreservedMode = Main.isPreserved(this.threadInformation.created_utc);

            var threadContainer = this.commentSection.template.getElementById("threadcontainer").content.cloneNode(true);

            /* Set the thread title and link to it */
            var title = threadContainer.querySelector(".title");
            title.appendChild(document.createTextNode(this.threadInformation.title));
            title.setAttribute("href", "http://reddit.com" + this.threadInformation.permalink);

            /* Set the username of the author and link to them */
            var username = threadContainer.querySelector(".at_author");
            username.appendChild(document.createTextNode(this.threadInformation.author));
            username.setAttribute("href", "http://www.reddit.com/u/" + this.threadInformation.author);
            username.setAttribute("data-username", this.threadInformation.author);
            if (this.threadInformation.distinguished === "moderator") {
                username.setAttribute("data-reddit-moderator", "true");
            }

            /* Add flair to the user */
            var flair = <HTMLSpanElement> threadContainer.querySelector(".at_flair");
            if (this.threadInformation.author_flair_text) {
                flair.appendChild(document.createTextNode(this.threadInformation.author_flair_text));
            } else {
                flair.style.display = "none";
            }

            /* Set the NSFW label on the post if applicable */
            if (this.threadInformation.over_18) {
                var optionsElement = threadContainer.querySelector(".options");
                var nsfwElement = document.createElement("acronym");
                nsfwElement.classList.add("nsfw");
                nsfwElement.setAttribute("title", Main.localisationManager.get("fullNSFWText"));
                nsfwElement.appendChild(document.createTextNode(Main.localisationManager.get("NSFW")));
                optionsElement.insertBefore(nsfwElement, optionsElement.firstChild);
            }

            /* Set the gild (how many times the user has been given gold for this post) if any */
            if (this.threadInformation.gilded) {
                var gildCountElement = threadContainer.querySelector(".at_gilded");
                gildCountElement.setAttribute("data-count", this.threadInformation.gilded);
            }

            /* Set the the thread posted time */
            var timestamp = threadContainer.querySelector(".at_timestamp");
            timestamp.appendChild(document.createTextNode(Main.getHumanReadableTimestamp(this.threadInformation.created_utc)));
            timestamp.setAttribute("timestamp", new Date(this.threadInformation.created_utc).toISOString());

            /* Set the localised text for "at {timestamp}" and "by {username}" */
            var submittedAtTimeText = threadContainer.querySelector(".templateSubmittedAtTimeText");
            submittedAtTimeText.appendChild(document.createTextNode(Main.localisationManager.get("submittedAtTimeText")));

            var submittedByUsernameText = threadContainer.querySelector(".templateSubmittedByUsernameText");
            submittedByUsernameText.appendChild(document.createTextNode(Main.localisationManager.get("submittedByUsernameText")));

            /* Set the button text and the event handler for the "comment" button */
            var openNewCommentBox = threadContainer.querySelector(".commentTo");
            openNewCommentBox.appendChild(document.createTextNode(Main.localisationManager.get("commentText")));

            /* Set the button text and the event handler for the "display source" button */
            var displaySourceForComment = threadContainer.querySelector(".at_displaysource");
            displaySourceForComment.appendChild(document.createTextNode(Main.localisationManager.get("displaySourceForCommentText")));

            /* Set the button text and the event handler for the "save" button */
            var saveItemToRedditList = threadContainer.querySelector(".save");
            if (this.threadInformation.saved) {
                saveItemToRedditList.appendChild(document.createTextNode(Main.localisationManager.get("removeItemFromRedditSaveList")));
                saveItemToRedditList.setAttribute("saved", "true");
            } else {
                saveItemToRedditList.appendChild(document.createTextNode(Main.localisationManager.get("saveItemToRedditList")));
            }
            saveItemToRedditList.addEventListener("click", this.onSaveButtonClick.bind(this), false);


            /* Set the button text and the event handler for the "refresh" button */
            var refreshCommentThread = threadContainer.querySelector(".refresh");
            refreshCommentThread.addEventListener("click", () => {
                this.commentSection.threadCollection.forEach((item) => {
                    if (item.id === this.threadInformation.id) {
                        this.commentSection.downloadThread(item);
                    }
                });
            }, false);
            refreshCommentThread.appendChild(document.createTextNode(Main.localisationManager.get("refreshCommentThreadText")));

            /* Set the button text and the link for the "give gold" button */
            var giveGoldToUser = threadContainer.querySelector(".giveGold");
            giveGoldToUser.setAttribute("href", "http://www.reddit.com/gold?goldtype=gift&months=1&thing=" + this.threadInformation.name);
            giveGoldToUser.appendChild(document.createTextNode(Main.localisationManager.get("giveGoldToUserText")));

            /* Set the button text and the event handler for the "report post" button */
            var reportToAdministrators = threadContainer.querySelector(".report");
            reportToAdministrators.appendChild(document.createTextNode(Main.localisationManager.get("reportToAdministratorsText")));

            /* Set the state of the voting buttons */
            var voteButtonScoreCountElement = threadContainer.querySelector(".score");
            voteButtonScoreCountElement.appendChild(document.createTextNode(this.threadInformation.score));

            /* Start iterating the top level comments in the comment section */
            this.commentData.forEach((commentObject) => {
                if (commentObject.kind === "more") {
                    var readmore = new LoadMore(commentObject.data, this, this);
                    this.children.push(readmore);
                    threadContainer.appendChild(readmore.representedHTMLElement);
                } else {
                    var comment = new Comment(commentObject.data, this);
                    this.children.push(comment);
                    threadContainer.appendChild(comment.representedHTMLElement);
                }
            });

            this.set(threadContainer);
        }

        /**
        * Sets the contents of the comment thread.
        * @param contents HTML DOM node or element to use.
        */
        set (contents : Node) {
            var threadContainer = document.getElementById("at_comments");
            while (threadContainer.firstChild) {
                threadContainer.removeChild(threadContainer.firstChild);
            }
            threadContainer.appendChild(contents);
        }

        onSaveButtonClick(eventObject : Event) {
            var saveButton = <HTMLSpanElement> eventObject.target;
            var savedType = saveButton.getAttribute("saved") ? SaveType.UNSAVE : SaveType.SAVE;
            new RedditSaveRequest(this.threadInformation.name, savedType, () => {
                if (savedType === SaveType.SAVE) {
                    saveButton.setAttribute("saved", "true");
                    saveButton.removeChild(saveButton.firstChild);
                    saveButton.appendChild(document.createTextNode(Main.localisationManager.get("removeItemFromRedditSaveList")));
                } else {
                    saveButton.removeAttribute("saved");
                    saveButton.removeChild(saveButton.firstChild);
                    saveButton.appendChild(document.createTextNode(Main.localisationManager.get("saveItemToRedditList")));
                }
            });
        }
    }
}
