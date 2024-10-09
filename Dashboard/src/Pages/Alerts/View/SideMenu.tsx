import PageMap from "../../../Utils/PageMap";
import RouteMap, { RouteUtil } from "../../../Utils/RouteMap";
import Route from "Common/Types/API/Route";
import IconProp from "Common/Types/Icon/IconProp";
import ObjectID from "Common/Types/ObjectID";
import SideMenu from "Common/UI/Components/SideMenu/SideMenu";
import SideMenuItem from "Common/UI/Components/SideMenu/SideMenuItem";
import SideMenuSection from "Common/UI/Components/SideMenu/SideMenuSection";
import React, { FunctionComponent, ReactElement } from "react";

export interface ComponentProps {
  modelId: ObjectID;
}

const DashboardSideMenu: FunctionComponent<ComponentProps> = (
  props: ComponentProps,
): ReactElement => {
  return (
    <SideMenu>
      <SideMenuSection title="Basic">
        <SideMenuItem
          link={{
            title: "Overview",
            to: RouteUtil.populateRouteParams(
              RouteMap[PageMap.ALERT_VIEW] as Route,
              { modelId: props.modelId },
            ),
          }}
          icon={IconProp.Info}
        />
        <SideMenuItem
          link={{
            title: "State Timeline",
            to: RouteUtil.populateRouteParams(
              RouteMap[PageMap.ALERT_VIEW_STATE_TIMELINE] as Route,
              { modelId: props.modelId },
            ),
          }}
          icon={IconProp.List}
        />

        <SideMenuItem
          link={{
            title: "Owners",
            to: RouteUtil.populateRouteParams(
              RouteMap[PageMap.ALERT_VIEW_OWNERS] as Route,
              { modelId: props.modelId },
            ),
          }}
          icon={IconProp.Team}
        />
      </SideMenuSection>

      <SideMenuSection title="Alert Notes">
        <SideMenuItem
          link={{
            title: "Private Notes",
            to: RouteUtil.populateRouteParams(
              RouteMap[PageMap.ALERT_INTERNAL_NOTE] as Route,
              { modelId: props.modelId },
            ),
          }}
          icon={IconProp.Lock}
        />
      </SideMenuSection>

      <SideMenuSection title="Advanced">
        <SideMenuItem
          link={{
            title: "Custom Fields",
            to: RouteUtil.populateRouteParams(
              RouteMap[PageMap.ALERT_VIEW_CUSTOM_FIELDS] as Route,
              { modelId: props.modelId },
            ),
          }}
          icon={IconProp.TableCells}
        />

        <SideMenuItem
          link={{
            title: "Delete Alert",
            to: RouteUtil.populateRouteParams(
              RouteMap[PageMap.ALERT_VIEW_DELETE] as Route,
              { modelId: props.modelId },
            ),
          }}
          icon={IconProp.Trash}
          className="danger-on-hover"
        />
      </SideMenuSection>
    </SideMenu>
  );
};

export default DashboardSideMenu;