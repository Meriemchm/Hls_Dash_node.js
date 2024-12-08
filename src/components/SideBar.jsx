import { useState } from "react";
import { SideBarData } from "./Data";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import { Outlet } from "react-router-dom";
import NavBarDash from "./NavBarDash";

const SideBar = () => {
  const [activeItem, setActiveItem] = useState(1);
  const location = useLocation();
  const currentPath = location.pathname.split("/").pop();

  return (
    <div className="flex h-full w-full overflow-hidden ">
      <div className="xl:w-5/4 w-72 bg-secondvariant py-10 hidden xl:flex ">
        <h1 className="knewave-regular px-10  font-extrabold text-3xl ml-2 md:text-4xl text-primary fixed">
          VideoPlayer
        </h1>

        <ul className="py-28 fixed ">
          {SideBarData.map(({ id, link, style, src }) => {
            return (
              <NavLink
                key={id}
                to={src}
                className={({ isActive }) =>
                  isActive ? "text-blue-500 " : " text-black"
                }
                end
              >
                <ul>
                  <li
                    className={`flex flex-row gap-3 py-5 px-8 cursor-pointer text-lg capitalize ${
                      currentPath === src.split("/").pop()
                        ? "bg-gradient-to-r from-white to-white"
                        : ""
                    }`}
                    onClick={() => {
                      setActiveItem(id);
                    }}
                  >
                    <p className={`self-center ${style} `}>{link}</p>
                  </li>
                </ul>
              </NavLink>
            );
          })}
        </ul>
      </div>

      {/* the outlets
       */}

      <div className="flex flex-col flex-1">
        <NavBarDash />
        <div className="flex-1">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SideBar;
