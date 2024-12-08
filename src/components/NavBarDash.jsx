// Sidebar.js
import React, {  useState } from "react";
import { NavLink } from "react-router-dom";
import { SideBarData } from "./Data";
import bars from "../assets/bars.svg";
import times from "../assets/times.svg";

const NavBarDash = () => {
  const [show, setShow] = useState(false);

  return (
    <>
      <div className="flex justify-between pt-5 xl:pt-0">
        <div
          onClick={() => setShow(!show)}
          className="cursor-pointer  z-50 text-gray-500 xl:hidden   px-5  pt-5  "
        >
          {show ? <img src={times} size={30} /> : <img src={bars} size={30} />}
        </div>
        {show && (
          <div className="flex fixed flex-col justify-start items-start p-5  top-0 z-10 left-0  w-1/2 h-screen bg-gray-200">
            <ul className="py-36 ">
              {SideBarData.map(({ id, link, src, style }) => {
                return (
                
                    <li
                      key={id}
                      className={`px-4 py-4 text-second cursor-pointer hover:scale-105 duration-200 capitalize ${style} `}
  
                    >
                      <NavLink
                        to={src}
                        className="md:text-xl text-base"
                        onClick={() => setShow(!show)}
                      >
                        {link}
                      </NavLink>
                    </li>
                
                );
              })}
            </ul>
          </div>
        )}

      </div>

    </>
  );
};

export default NavBarDash;
