import type { Component, JSX } from "solid-js";

import Heading from "./Heading";

export interface PageHeaderProps {
  children: JSX.Element;
  action?: JSX.Element;
}

const PageHeader: Component<PageHeaderProps> = (props) => {
  return (
    <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4 sm:mb-6">
      <Heading level={1}>{props.children}</Heading>
      {props.action}
    </div>
  );
};

export default PageHeader;
