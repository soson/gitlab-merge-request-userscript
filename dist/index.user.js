// ==UserScript==
// @name        Enhanced Gitlab Merged Request
// @namespace   Violentmonkey Scripts
// @description This is a userscript.
// @match       https://gitlab.com/**/merge_requests
// @grant       none
// @version     0.0.3
// @author      -
// @require     https://cdn.jsdelivr.net/combine/npm/@violentmonkey/dom,npm/@violentmonkey/ui
// ==/UserScript==

(function () {
'use strict';

const API_PREFIX = `https://${window.location.hostname}/api/v4`;

function convertApprovalsResponseToApprovals(data) {
  return data.approved_by.map(approver => {
    return {
      photo: approver.user.avatar_url,
      name: approver.user.name,
      username: approver.user.username
    };
  });
}

async function getMergeRequestApprovals(projectId, mergeRequestId) {
  const response = await fetch(`${API_PREFIX}/projects/${projectId}/merge_requests/${mergeRequestId}/approvals`);
  return convertApprovalsResponseToApprovals(await response.json());
}

function convertMergeRequestResponseToMergeRequestDetail(data) {
  return {
    isDiscussionResolved: data.blocking_discussions_resolved
  };
}

async function getMergeRequestDetails(projectId, mergeRequestId) {
  const response = await fetch(`${API_PREFIX}/projects/${projectId}/merge_requests/${mergeRequestId}`);
  return convertMergeRequestResponseToMergeRequestDetail(await response.json());
}

function getMergeRequestIdFromURL(url) {
  return url.split("/").pop();
}

async function getProjectIdFromURL(url) {
  const regex = /.*\/(.*)\/-\/merge_requests.*/;
  const projectName = url.match(regex);
  const response = await fetch(`${API_PREFIX}/projects/?membership=true&search=${projectName[1]}`);
  const project = await response.json();
  return project[0].id;
}

function createAvatar(avatarURL, name, userName) {
  const htmlString = `<a class="author-link has-tooltip approval" title="" href="/${userName}" data-original-title="Approved by ${name}">
    <img class="avatar avatar-inline s16 js-lazy-loaded qa-js-lazy-loaded" alt="" src="${avatarURL}?s=32&amp;d=identicon" width="16">
  </a>`;
  return document.createRange().createContextualFragment(htmlString);
}

function updateApprovers(node, approvals) {
  /* remove previous approvals avatars (repeated clicking on bookmarklet adds new avatars) */
  node.querySelectorAll("a.approval").forEach(el => {
    el.remove();
  });
  approvals.forEach(({
    photo,
    name,
    username
  }) => {
    const avatar = createAvatar(photo, name, username);
    node.appendChild(avatar);
  });
}

function updateComments(node, comments) {
  const {
    isDiscussionResolved
  } = comments;
  node.querySelector("li.issuable-comments a.has-tooltip").setAttribute("style", `color: ${isDiscussionResolved ? "#1aaa55" : "#db3b21"}`);
}

function updateDOM(node, approvals, detail) {
  updateComments(node, detail);
  updateApprovers(node, approvals);
}

async function updateMergeRequest(node) {
  const mergeRequestURL = node.querySelector(".merge-request-title a").getAttribute("href");
  const mergeRequestId = getMergeRequestIdFromURL(mergeRequestURL);
  const projectId = await getProjectIdFromURL(mergeRequestURL);
  const detail = await getMergeRequestDetails(projectId, mergeRequestId);
  const approvals = await getMergeRequestApprovals(projectId, mergeRequestId);
  updateDOM(node, approvals, detail);
}

async function updateAllMergeRequests() {
  const nodeList = document.querySelectorAll(".merge-request");
  nodeList.forEach(node => {
    updateMergeRequest(node);
  });
}

function init() {
  (async () => await updateAllMergeRequests())();
}

init();

}());
