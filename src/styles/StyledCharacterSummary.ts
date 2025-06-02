import { Link } from "react-router-dom";
import { styled } from "styled-components";

const StyledCharacterSummary = styled(Link)`
  display: block;
  background-color: #333;
  color: white;
  text-decoration: none;
  overflow: hidden;
  transition: transform 0.2s, box-shadow 0.2s;
  height: 200px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
  border-width: 2px 0 2px 0;
  border-style: solid;
  border-color: #444;
  cursor: pointer;

  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 15px rgba(0, 0, 0, 0.4);
    border-color: rgb(255, 162, 22);
    h2 {
      color: rgb(255, 162, 22);
    }
  }

  .card-content {
    padding: 20px;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  h2 {
    font-family: "Oswald", sans-serif;
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 10px;
    color: white;
  }

  .char-info {
    display: flex;
    flex-direction: column;
    flex-grow: 1;
  }

  .full-name {
    font-size: 16px;
    margin-bottom: 5px;
  }

  .char-class {
    font-size: 14px;
    color: #9f9f9f;
    margin-bottom: 15px;
  }

  .status-bars {
    margin-top: auto;
  }

  .status-bar {
    display: flex;
    align-items: center;
    margin-bottom: 6px;

    .label {
      width: 70px;
      font-size: 14px;
    }

    .bar {
      flex-grow: 1;
      height: 14px;
      background-color: #444;
      border-radius: 5px;
      overflow: hidden;
      margin: 0 10px;
    }

    .fill {
      height: 100%;
      border-radius: 5px;
    }

    .value {
      width: 70px;
      text-align: left;
      font-size: 14px;
    }
  }

  .health .fill {
    background-color: #e74c3c;
  }

  .stamina .fill {
    background-color: #2ecc71;
  }

  @media (orientation: landscape) {
    width: 80vw;
    border-radius: 16px;
    &:hover {
      h2 {
        color: rgb(255, 162, 22);
      }
      border: 2px solid rgb(255, 162, 22);
    }
  }
`;
export default StyledCharacterSummary;
