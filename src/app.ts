const API_PREFIX = `https://${window.location.hostname}/api/v4`;

type Approver = {
  photo: string;
  name: string;
  username: string;
};
type Approvals = Approver[];

function convertApprovalsResponseToApprovals(
  data: ApprovalsResponseJson
): Approvals {
  return data.approved_by.map((approver) => {
    return {
      photo: approver.user.avatar_url,
      name: approver.user.name,
      username: approver.user.username,
    };
  });
}

type ApprovalsResponseJson = {
  id: string;
  approved_by: {
    user: {
      avatar_url: string;
      name: string;
      username: string;
    };
  }[];
};

async function getMergeRequestApprovals(
  projectId: string,
  mergeRequestId: string
): Promise<Approvals> {
  const response = await fetch(
    `${API_PREFIX}/projects/${projectId}/merge_requests/${mergeRequestId}/approvals`
  );
  return convertApprovalsResponseToApprovals(await response.json());
}

type MergeRequestDetail = {
  isDiscussionResolved: boolean;
  hasConflicts: boolean;
};

function convertMergeRequestResponseToMergeRequestDetail(
  data: MergeRequestResponse
): MergeRequestDetail {
  return {
    isDiscussionResolved: data.blocking_discussions_resolved,
    hasConflicts: data.has_conflicts,
  };
}

type MergeRequestResponse = {
  blocking_discussions_resolved: boolean;
  has_conflicts: boolean;
};

async function getMergeRequestDetails(
  projectId: string,
  mergeRequestId: string
): Promise<MergeRequestDetail> {
  const response = await fetch(
    `${API_PREFIX}/projects/${projectId}/merge_requests/${mergeRequestId}`
  );
  return convertMergeRequestResponseToMergeRequestDetail(await response.json());
}

type ProjectResponseJson = {
  id: string;
  name: string;
}[];

function getMergeRequestIdFromURL(url: string): string {
  return url.split("/").pop();
}

async function getProjectIdFromURL(url: string): Promise<string> {
  const regex = /.*\/(.*)\/-\/merge_requests.*/;
  const projectName = url.match(regex);
  const response = await fetch(
    `${API_PREFIX}/projects/?membership=true&search=${projectName[1]}`
  );

  const projects: ProjectResponseJson = await response.json();

  // there can be more search results if the names overlapping (searching for project-1 will return project-1, project-11, ...)
  // we must filter out the one that we are interested in
  const filteredProjects = projects.filter((p) => p.name === projectName[1]);

  return filteredProjects[0].id;
}

function createAvatar(
  avatarURL: string,
  name: string,
  userName: string
): DocumentFragment {
  const htmlString = `<a class="author-link has-tooltip approval" title="" href="/${userName}" data-original-title="Approved by ${name}">
    <img class="avatar avatar-inline s16 js-lazy-loaded qa-js-lazy-loaded" alt="" src="${avatarURL}?s=32&amp;d=identicon" width="16">
  </a>`;

  return document.createRange().createContextualFragment(htmlString);
}

function updateApprovers(node: Element, approvals: Approvals): void {
  /* remove previous approvals avatars (repeated clicking on bookmarklet adds new avatars) */
  node.querySelectorAll("a.approval").forEach((el) => {
    el.remove();
  });

  approvals.forEach(({ photo, name, username }) => {
    const avatar = createAvatar(photo, name, username);
    node.appendChild(avatar);
  });
}

function updateComments(node: Element, isDiscussionResolved: boolean): void {
  node
    .querySelector("li.issuable-comments a.has-tooltip")
    .setAttribute(
      "style",
      `color: ${isDiscussionResolved ? "#1aaa55" : "#db3b21"}`
    );
}

function updateConflict(node: Element): void {
  node
    .querySelector("li.issuable-pipeline-broken a.has-tooltip")
    .setAttribute("style", "color: #db3b21");
}

function updateDOM(
  node: Element,
  approvals: Approvals,
  detail: MergeRequestDetail
): void {
  const { hasConflicts, isDiscussionResolved } = detail;
  hasConflicts && updateConflict(node);
  updateComments(node, isDiscussionResolved);
  updateApprovers(node, approvals);
}

async function updateMergeRequest(node: Element): Promise<void> {
  const mergeRequestURL = node
    .querySelector(".merge-request-title a")
    .getAttribute("href");
  const mergeRequestId = getMergeRequestIdFromURL(mergeRequestURL);
  const projectId = await getProjectIdFromURL(mergeRequestURL);
  const detail = await getMergeRequestDetails(projectId, mergeRequestId);
  const approvals = await getMergeRequestApprovals(projectId, mergeRequestId);
  updateDOM(node, approvals, detail);
}

async function updateAllMergeRequests(): Promise<void> {
  const nodeList = document.querySelectorAll(".merge-request");

  nodeList.forEach((node) => {
    updateMergeRequest(node);
  });
}

export function init(): void {
  (async (): Promise<void> => await updateAllMergeRequests())();
}
