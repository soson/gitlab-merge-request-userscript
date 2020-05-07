// ==UserScript==
// @name        Enhanced Gitlab Merged Request
// @namespace   Violentmonkey Scripts
// @description This is a userscript.
// @match       https://gitlab.com/**/merge_requests
// @grant       none
// @version     0.0.0
// @author      -
// @require     https://cdn.jsdelivr.net/combine/npm/@violentmonkey/dom,npm/@violentmonkey/ui
// ==/UserScript==

(function () {
'use strict';

const API_PREFIX = "https://gitlab.com/api/v4/";

function getProjectId() {
  return document.querySelector("#search_project_id").value;
}

function getMergeRequestIdFromURL(url) {
  return url.split("/").pop();
}

function getMergeRequestIds() {
  return Array.from(document.querySelectorAll(".merge-request-title a")).map(element => {
    const url = element.getAttribute("href");
    const mergeRequestId = getMergeRequestIdFromURL(url);
    return mergeRequestId;
  });
}

async function getMergeRequestApprovals(projectId, mergeRequestId) {
  const response = await fetch(`${API_PREFIX}/projects/${projectId}/merge_requests/${mergeRequestId}/approvals`);
  return response.json();
}

function convertJsonToApproval(data) {
  return data.approved_by.map(approver => {
    return {
      photo: approver.user.avatar_url,
      name: approver.user.name,
      username: approver.user.username
    };
  });
}

async function getMergeRequestApprovalsMap(projectId, mergeRequestIds) {
  const data = await Promise.all(mergeRequestIds.map(mergeRequestId => getMergeRequestApprovals(projectId, mergeRequestId)));
  return new Map(data.map(d => [String(d.id), convertJsonToApproval(d)]));
}

function createAvatar(avatarURL, name, userName) {
  const htmlString = `<a class="author-link has-tooltip" title="" href="/${userName}" data-original-title="Approved by ${name}">
    <img class="avatar avatar-inline s16 js-lazy-loaded qa-js-lazy-loaded" alt="" src="${avatarURL}?s=32&amp;d=identicon" width="16">
  </a>`;
  return document.createRange().createContextualFragment(htmlString);
}

function updateDOM(data) {
  const nodeList = document.querySelectorAll(".merge-requests-holder > ul > li");
  nodeList.forEach(node => {
    const mergeRequestId = node.getAttribute("data-id");
    const approvals = data.get(mergeRequestId);
    approvals.forEach(({
      photo,
      name,
      username
    }) => {
      const avatar = createAvatar(photo, name, username);
      node.appendChild(avatar);
    });
  });
}

async function asyncInit() {
  const projectId = getProjectId();
  const mergeRequestIds = getMergeRequestIds();
  const approvalsMap = await getMergeRequestApprovalsMap(projectId, mergeRequestIds);
  updateDOM(approvalsMap);
}

function init() {
  (async () => await asyncInit())();
}

init();

}());
