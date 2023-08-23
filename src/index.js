import React from 'react';
import ReactDOM from 'react-dom';
import ImageDisplay from './ImageDisplay';
import Navbar from './Navbar';


class App extends React.Component {
  render() {
    return (


      <div style={{ display: 'flex' }}  >

        <div>
          <Navbar />
        </div>

        <div style={{width:'100%', margin:'10px'}} >
          <ImageDisplay />
        </div>

      </div>


    );
  }
}

ReactDOM.render(<App />, document.getElementById('app'));
