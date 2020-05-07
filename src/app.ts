const API_PREFIX = "https://gitlab.com/api/v4/";

function getProjectId(): string {
  return (document.querySelector("#search_project_id") as HTMLInputElement)
    .value;
}

function getMergeRequestIdFromURL(url: string): string {
  return url.split("/").pop();
}

function getMergeRequestIds(): string[] {
  return Array.from(document.querySelectorAll(".merge-request-title a")).map(
    (element) => {
      const url = element.getAttribute("href");
      const mergeRequestId = getMergeRequestIdFromURL(url);
      return mergeRequestId;
    }
  );
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
): Promise<ApprovalsResponseJson> {
  const response = await fetch(
    `${API_PREFIX}/projects/${projectId}/merge_requests/${mergeRequestId}/approvals`
  );
  return response.json();
}

type Approver = {
  photo: string;
  name: string;
  username: string;
};
type Approval = Approver[];
type ApprovalsMap = Map<string, Approval>;

function convertJsonToApproval(data: ApprovalsResponseJson): Approval {
  return data.approved_by.map((approver) => {
    return {
      photo: approver.user.avatar_url,
      name: approver.user.name,
      username: approver.user.username,
    };
  });
}

async function getMergeRequestApprovalsMap(
  projectId,
  mergeRequestIds
): Promise<ApprovalsMap> {
  const data = await Promise.all(
    mergeRequestIds.map((mergeRequestId) =>
      getMergeRequestApprovals(projectId, mergeRequestId)
    )
  );

  return new Map(
    data.map((d: ApprovalsResponseJson) => [
      String(d.id),
      convertJsonToApproval(d),
    ])
  );
}

function createAvatar(
  avatarURL: string,
  name: string,
  userName: string
): DocumentFragment {
  const htmlString = `<a class="author-link has-tooltip" title="" href="/${userName}" data-original-title="Approved by ${name}">
    <img class="avatar avatar-inline s16 js-lazy-loaded qa-js-lazy-loaded" alt="" src="${avatarURL}?s=32&amp;d=identicon" width="16">
  </a>`;

  return document.createRange().createContextualFragment(htmlString);
}

function updateDOM(data: ApprovalsMap): void {
  const nodeList = document.querySelectorAll(
    ".merge-requests-holder > ul > li"
  );

  nodeList.forEach((node) => {
    const mergeRequestId = node.getAttribute("data-id");
    const approvals = data.get(mergeRequestId);

    approvals.forEach(({ photo, name, username }) => {
      const avatar = createAvatar(photo, name, username);
      node.appendChild(avatar);
    });
  });
}

async function asyncInit(): Promise<void> {
  const projectId = getProjectId();
  const mergeRequestIds = getMergeRequestIds();
  const approvalsMap = await getMergeRequestApprovalsMap(
    projectId,
    mergeRequestIds
  );
  updateDOM(approvalsMap);
}

export function init(): void {
  (async (): Promise<void> => await asyncInit())();
}
